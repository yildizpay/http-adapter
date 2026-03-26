import { Request } from '../models/request';
import { Response } from '../models/response';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';

/**
 * A read-only observer for the `HttpAdapter` request lifecycle.
 *
 * Unlike interceptors, observers cannot modify requests or responses — they are
 * purely side-effectful and intended for telemetry, metrics, and structured logging.
 *
 * All hooks are optional; implement only the events you need.
 *
 * @example
 * ```typescript
 * class MetricsObserver implements HttpAdapterObserver {
 *   onRequestSuccess(response: Response, durationMs: number): void {
 *     metrics.histogram('http.request.duration', durationMs, {
 *       status: response.status,
 *     });
 *   }
 *
 *   onRequestFailure(error: BaseAdapterException, durationMs: number): void {
 *     metrics.increment('http.request.error', { type: error.name });
 *   }
 * }
 *
 * HttpAdapter.builder()
 *   .withObserver(new MetricsObserver())
 *   .build();
 * ```
 */
export interface HttpAdapterObserver {
  /**
   * Called immediately before the request is dispatched to the HTTP client.
   * Fires after all request-side interceptors have run.
   *
   * @param request - The fully processed outgoing request.
   */
  onRequestStart?(request: Request): void;

  /**
   * Called after a successful response has passed all validators and interceptors.
   *
   * @param response - The final response returned to the caller.
   * @param durationMs - Total round-trip time in milliseconds, from dispatch to completion.
   */
  onRequestSuccess?(response: Response, durationMs: number): void;

  /**
   * Called when the request fails after all retry attempts are exhausted.
   *
   * @param error - The final error propagated to the caller.
   * @param durationMs - Total time elapsed in milliseconds from the first dispatch attempt.
   */
  onRequestFailure?(error: BaseAdapterException, durationMs: number): void;

  /**
   * Called each time a retry attempt is scheduled.
   *
   * @param attempt - The retry attempt number (starts at 1).
   * @param error - The error that triggered the retry.
   * @param delayMs - The computed backoff delay in milliseconds before the next attempt.
   */
  onRetry?(attempt: number, error: BaseAdapterException, delayMs: number): void;
}
