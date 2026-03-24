import {
  NetworkException,
  ConnectionRefusedException,
  DnsResolutionException,
  TimeoutException,
  SocketResetException,
  HostUnreachableException,
} from './network.exceptions';
import { RequestContext } from '../models/request-context';

/**
 * Factory responsible for converting raw transport-level errors into semantic
 * {@link NetworkException} subclasses.
 *
 * Supports classification of common Node.js and browser Fetch API error patterns:
 * - `AbortError` / `ECONNABORTED` / `ETIMEDOUT` → {@link TimeoutException}
 * - `ECONNREFUSED` → {@link ConnectionRefusedException}
 * - `ECONNRESET` → {@link SocketResetException}
 * - `ENOTFOUND` / `EAI_AGAIN` → {@link DnsResolutionException}
 * - `EHOSTUNREACH` / `ENETUNREACH` → {@link HostUnreachableException}
 * - All other errors → generic {@link NetworkException}
 */
export class NetworkExceptionFactory {
  /**
   * Creates a typed {@link NetworkException} from an unknown native error.
   *
   * When the input is a standard `Error`, the factory inspects `error.name`
   * and `error.code` to determine the appropriate subclass. Non-Error inputs
   * (strings, plain objects, etc.) are wrapped in a generic {@link NetworkException}.
   *
   * @param error - The raw error thrown by the underlying transport layer.
   * @param requestContext - Safe metadata about the originating request.
   * @returns A strongly-typed {@link NetworkException} subclass.
   */
  public static createFromNativeError(
    error: unknown,
    requestContext?: RequestContext,
  ): NetworkException {
    if (error instanceof Error) {
      const code = 'code' in error ? String(error.code) : undefined;

      if (error.name === 'AbortError' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        return new TimeoutException(error.message, code || 'ECONNABORTED', error, requestContext);
      }

      if (code === 'ECONNREFUSED') {
        return new ConnectionRefusedException(error.message, code, error, requestContext);
      }

      if (code === 'ECONNRESET') {
        return new SocketResetException(error.message, code, error, requestContext);
      }

      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        return new DnsResolutionException(error.message, code, error, requestContext);
      }

      if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
        return new HostUnreachableException(error.message, code, error, requestContext);
      }

      return new NetworkException(error.message, code, error, requestContext);
    }

    const message = this.extractMessage(error);

    return new NetworkException(message, undefined, undefined, requestContext);
  }

  /**
   * Extracts a human-readable message from an unknown, non-Error throwable.
   *
   * Resolution order:
   * 1. `error.message` if the object has a `message` property.
   * 2. The raw string value if the input is a string.
   * 3. Falls back to `'Unknown Network Error'`.
   *
   * @param error - A non-Error throwable value.
   * @returns A string suitable for use as an exception message.
   */
  private static extractMessage(error: unknown): string {
    return (
      (error as { message?: string })?.message ??
      (typeof error === 'string' ? error : 'Unknown Network Error')
    );
  }
}
