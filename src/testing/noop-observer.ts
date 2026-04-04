import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { Request } from '../models/request';
import { Response } from '../models/response';
import { HttpAdapterObserver } from '../observability/http-adapter-observer';

/**
 * A no-op implementation of all `HttpAdapterObserver` hooks.
 *
 * All hooks are implemented as empty methods. Useful as a base class when only
 * a subset of hooks needs to be overridden, or as a safe stand-in for tests
 * that require an observer but do not care about observability side effects.
 *
 * @example
 * ```typescript
 * HttpAdapter.builder()
 *   .withObserver(new NoopObserver())
 *   .build();
 * ```
 */
export class NoopObserver implements Required<HttpAdapterObserver> {
  /**
   * Called before the request is dispatched. Does nothing.
   *
   * @param _request - The outgoing request (unused).
   */
  onRequestStart(_request: Request): void {}

  /**
   * Called after a successful response. Does nothing.
   *
   * @param _response - The final response (unused).
   * @param _durationMs - Round-trip duration in milliseconds (unused).
   */
  onRequestSuccess(_response: Response, _durationMs: number): void {}

  /**
   * Called when the request fails. Does nothing.
   *
   * @param _error - The final error (unused).
   * @param _durationMs - Elapsed time in milliseconds (unused).
   */
  onRequestFailure(_error: BaseAdapterException, _durationMs: number): void {}

  /**
   * Called each time a retry is scheduled. Does nothing.
   *
   * @param _attempt - The retry attempt number (unused).
   * @param _error - The error that triggered the retry (unused).
   * @param _delayMs - Backoff delay in milliseconds (unused).
   */
  onRetry(_attempt: number, _error: BaseAdapterException, _delayMs: number): void {}
}
