/**
 * Defines the contract for an HTTP retry policy.
 *
 * Subclasses should implement specific retry strategies, such as exponential backoff,
 * constant delay, or custom logic to determine when and how to retry failed requests.
 */
export abstract class RetryPolicy {
  /**
   * The maximum number of retry attempts allowed.
   */
  public abstract maxAttempts: number;

  /**
   * Calculates the delay in milliseconds before the next retry attempt.
   *
   * @param attempt - The current attempt number (starting from 1).
   * @returns The delay duration in milliseconds.
   */
  public abstract backoffMs(attempt: number): number;

  /**
   * Determines whether a retry should be attempted based on the error received.
   *
   * @param error - The error encountered during the request.
   * @returns `true` if the request should be retried; otherwise, `false`.
   */
  public abstract retryOn(error: unknown): boolean;
}
