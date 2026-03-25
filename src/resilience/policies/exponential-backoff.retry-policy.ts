import { RetryPolicy } from '../../contracts/retry-policy.contract';
import { BaseAdapterException } from '../../exceptions/base-adapter.exception';

/**
 * A retry policy that implements an exponential backoff strategy.
 *
 * This strategy increases the wait time between retries exponentially (2^attempt)
 * to reduce load on the failing service. It also includes a random jitter to prevent
 * thundering herd problems.
 */
export class ExponentialBackoffPolicy extends RetryPolicy {
  /**
   * Initializes a new instance of the ExponentialBackoffPolicy class.
   *
   * @param maxAttempts - The maximum number of retry attempts (default: 3).
   */
  constructor(public maxAttempts: number = 3) {
    super();
    this.maxAttempts = maxAttempts;
  }

  /**
   * Determines if the operation should be retried based on the error.
   *
   * Delegates the decision to {@link BaseAdapterException.isRetryable}, which encodes
   * the retryability contract for every exception in the hierarchy. Non-adapter errors
   * (i.e. anything not converted by `ErrorConverter`) are never retried.
   *
   * @param error - The error encountered.
   * @returns `true` if the error is retryable; otherwise `false`.
   */
  public retryOn(error: unknown): boolean {
    return error instanceof BaseAdapterException && error.isRetryable();
  }

  /**
   * Calculates the delay before the next retry attempt using exponential backoff with jitter.
   *
   * Formula: (2^attempt * 100) + random(0-50) ms.
   *
   * @param attempt - The current attempt number.
   * @returns The delay duration in milliseconds.
   */
  public backoffMs(attempt: number): number {
    const base = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return base + jitter;
  }
}
