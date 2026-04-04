import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { Request } from '../models/request';
import { Response } from '../models/response';
import { HttpAdapterObserver } from '../observability/http-adapter-observer';

/** A single recorded invocation of the {@link SpyObserver.onRequestSuccess} hook. */
export interface SpyObserverSuccessCall {
  /** The final response returned to the caller. */
  response: Response;
  /** Total round-trip time in milliseconds. */
  durationMs: number;
}

/** A single recorded invocation of the {@link SpyObserver.onRequestFailure} hook. */
export interface SpyObserverFailureCall {
  /** The final error propagated to the caller. */
  error: BaseAdapterException;
  /** Total elapsed time in milliseconds. */
  durationMs: number;
}

/** A single recorded invocation of the {@link SpyObserver.onRetry} hook. */
export interface SpyObserverRetryCall {
  /** The retry attempt number (1-based). */
  attempt: number;
  /** The error that triggered the retry. */
  error: BaseAdapterException;
  /** Backoff delay in milliseconds before the next attempt. */
  delayMs: number;
}

/**
 * A spy implementation of all `HttpAdapterObserver` hooks.
 *
 * Each hook records its invocation arguments and does nothing else. Use the
 * `*Calls` arrays in assertions and call `reset()` between tests to start with
 * a clean slate.
 *
 * @example
 * ```typescript
 * const spy = new SpyObserver();
 *
 * HttpAdapter.builder()
 *   .withObserver(spy)
 *   .build();
 *
 * // after making a request:
 * expect(spy.requestStartCalls).toHaveLength(1);
 * expect(spy.successCalls[0].durationMs).toBeGreaterThan(0);
 * ```
 */
export class SpyObserver implements Required<HttpAdapterObserver> {
  /** All requests recorded by {@link onRequestStart}, in call order. */
  readonly requestStartCalls: Request[] = [];

  /** All invocations of {@link onRequestSuccess}, in call order. */
  readonly successCalls: SpyObserverSuccessCall[] = [];

  /** All invocations of {@link onRequestFailure}, in call order. */
  readonly failureCalls: SpyObserverFailureCall[] = [];

  /** All invocations of {@link onRetry}, in call order. */
  readonly retryCalls: SpyObserverRetryCall[] = [];

  /**
   * Records the outgoing request.
   *
   * @param request - The fully processed outgoing request.
   */
  onRequestStart(request: Request): void {
    this.requestStartCalls.push(request);
  }

  /**
   * Records the successful response and its round-trip duration.
   *
   * @param response - The final response returned to the caller.
   * @param durationMs - Total round-trip time in milliseconds.
   */
  onRequestSuccess(response: Response, durationMs: number): void {
    this.successCalls.push({ response, durationMs });
  }

  /**
   * Records the failure error and elapsed duration.
   *
   * @param error - The final error propagated to the caller.
   * @param durationMs - Total elapsed time in milliseconds.
   */
  onRequestFailure(error: BaseAdapterException, durationMs: number): void {
    this.failureCalls.push({ error, durationMs });
  }

  /**
   * Records the retry attempt details.
   *
   * @param attempt - The retry attempt number (1-based).
   * @param error - The error that triggered the retry.
   * @param delayMs - Backoff delay in milliseconds before the next attempt.
   */
  onRetry(attempt: number, error: BaseAdapterException, delayMs: number): void {
    this.retryCalls.push({ attempt, error, delayMs });
  }

  /**
   * Clears all recorded calls from every hook.
   *
   * Call this in `beforeEach` or `afterEach` to avoid cross-test contamination.
   */
  reset(): void {
    this.requestStartCalls.length = 0;
    this.successCalls.length = 0;
    this.failureCalls.length = 0;
    this.retryCalls.length = 0;
  }
}
