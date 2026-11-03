import type { RequestContext } from '../models/request-context';
import { type DeliveryOutcome, isDeliveryOutcome } from './delivery-outcome';
import {
  ConnectionRefusedException,
  DnsResolutionException,
  HostUnreachableException,
  NetworkException,
  SocketResetException,
  TimeoutException,
} from './network.exceptions';

/** Shape shared by Node.js system errors, undici errors and DOMExceptions. */
interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  cause?: unknown;
  deliveryOutcome?: unknown;
}

const TIMEOUT_NAMES = new Set(['AbortError', 'TimeoutError']);
const TIMEOUT_CODES = new Set([
  'ECONNABORTED',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);
const RESET_CODES = new Set(['ECONNRESET', 'EPIPE', 'UND_ERR_SOCKET']);
const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const UNREACHABLE_CODES = new Set(['EHOSTUNREACH', 'ENETUNREACH']);

/**
 * Codes that can only occur before a connection exists, or while TLS is still being negotiated,
 * so no part of the request was written. Everything else is `unknown`.
 */
const NOT_SENT_CODES = new Set([
  ...DNS_CODES,
  ...UNREACHABLE_CODES,
  'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_TLS_HANDSHAKE_TIMEOUT',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

/** How deep to follow `cause` links; guards against cycles. */
const MAX_CAUSE_DEPTH = 5;

/**
 * Factory responsible for converting raw transport-level errors into semantic
 * {@link NetworkException} subclasses.
 *
 * Native `fetch` (undici) rejects with `TypeError: fetch failed` and puts the real
 * error on `cause`, so the whole `cause` chain is inspected:
 * - `AbortError` / `TimeoutError` / `ECONNABORTED` / `ETIMEDOUT` /
 *   `UND_ERR_CONNECT_TIMEOUT` / `UND_ERR_HEADERS_TIMEOUT` / `UND_ERR_BODY_TIMEOUT`
 *   → {@link TimeoutException}
 * - `ECONNREFUSED` → {@link ConnectionRefusedException}
 * - `ECONNRESET` / `EPIPE` / `UND_ERR_SOCKET` → {@link SocketResetException}
 * - `ENOTFOUND` / `EAI_AGAIN` → {@link DnsResolutionException}
 * - `EHOSTUNREACH` / `ENETUNREACH` → {@link HostUnreachableException}
 * - All other errors → generic {@link NetworkException}
 *
 * Errors are recognised by shape rather than `instanceof Error`, so errors created in
 * another realm (e.g. undici's `DOMException` under Jest's VM context) are classified too.
 *
 * The {@link DeliveryOutcome} is, in order: the one passed by the caller (the default client
 * measures it), a valid `deliveryOutcome` set on the error or its `cause` chain by a custom
 * client, or `not_sent` for codes that only occur before anything is written. Otherwise it is
 * `unknown`.
 */
export class NetworkExceptionFactory {
  /**
   * Creates a typed {@link NetworkException} from an unknown native error.
   *
   * @param error - The raw error thrown by the underlying transport layer.
   * @param requestContext - Optional safe metadata about the originating request.
   * @param deliveryOutcome - The outcome observed by the transport, when it knows it.
   * @returns A {@link NetworkException} or one of its specific subclasses.
   */
  public static createFromNativeError(
    error: unknown,
    requestContext?: RequestContext,
    deliveryOutcome?: DeliveryOutcome,
  ): NetworkException {
    if (!isErrorLike(error)) {
      return new NetworkException(
        NetworkExceptionFactory.extractMessage(error),
        undefined,
        undefined,
        requestContext,
        deliveryOutcome ?? 'unknown',
      );
    }

    const chain = causeChain(error);
    const coded = chain.find((e) => typeof e.code === 'string');
    const code = coded ? (coded.code as string) : undefined;
    const message = messageOf(coded ?? error);
    const outcome = deliveryOutcome ?? NetworkExceptionFactory.outcomeOf(chain, code);

    if (
      chain.some((e) => TIMEOUT_NAMES.has(e.name as string)) ||
      (code && TIMEOUT_CODES.has(code))
    ) {
      return new TimeoutException(message, code ?? 'ECONNABORTED', error, requestContext, outcome);
    }
    if (code === 'ECONNREFUSED') {
      return new ConnectionRefusedException(message, code, error, requestContext, outcome);
    }
    if (code && RESET_CODES.has(code)) {
      return new SocketResetException(message, code, error, requestContext, outcome);
    }
    if (code && DNS_CODES.has(code)) {
      return new DnsResolutionException(message, code, error, requestContext, outcome);
    }
    if (code && UNREACHABLE_CODES.has(code)) {
      return new HostUnreachableException(message, code, error, requestContext, outcome);
    }
    return new NetworkException(message, code, error, requestContext, outcome);
  }

  /**
   * Returns the first string `code` found on the error or its `cause` chain.
   *
   * Useful for custom clients and converters that need to recognise transport errors
   * whose code is nested (e.g. `TypeError: fetch failed` → `cause.code === 'ECONNREFUSED'`).
   */
  public static resolveCode(error: unknown): string | undefined {
    if (!isErrorLike(error)) return undefined;
    const coded = causeChain(error).find((e) => typeof e.code === 'string');
    return coded?.code as string | undefined;
  }

  /**
   * Returns the {@link DeliveryOutcome} of an error without transport measurements: a valid
   * outcome set on the error chain by a custom client, else one derived from the error code.
   */
  public static resolveDeliveryOutcome(error: unknown): DeliveryOutcome {
    if (!isErrorLike(error)) return 'unknown';
    const chain = causeChain(error);
    const coded = chain.find((e) => typeof e.code === 'string');
    return NetworkExceptionFactory.outcomeOf(chain, coded?.code as string | undefined);
  }

  private static outcomeOf(chain: ErrorLike[], code: string | undefined): DeliveryOutcome {
    const declared = chain.find((e) => isDeliveryOutcome(e.deliveryOutcome))?.deliveryOutcome;
    if (isDeliveryOutcome(declared)) return declared;
    return code !== undefined && NOT_SENT_CODES.has(code) ? 'not_sent' : 'unknown';
  }

  /**
   * Safely extracts a human-readable message from an unknown error value.
   *
   * @private
   */
  private static extractMessage(error: unknown): string {
    return (
      (error as { message?: string })?.message ??
      (typeof error === 'string' ? error : 'Unknown Network Error')
    );
  }
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null && ('message' in value || 'name' in value);
}

function causeChain(error: ErrorLike): ErrorLike[] {
  const chain: ErrorLike[] = [error];
  let current = error.cause;
  while (isErrorLike(current) && chain.length < MAX_CAUSE_DEPTH && !chain.includes(current)) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function messageOf(error: ErrorLike): string {
  return typeof error.message === 'string' && error.message ? error.message : 'Network Error';
}
