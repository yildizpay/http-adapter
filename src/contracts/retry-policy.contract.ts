import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { RetryPredicate } from './retry-predicate.contract';

/**
 * Defines the contract for an HTTP retry policy.
 *
 * Subclasses implement the backoff timing strategy (`backoffMs`). The retry decision
 * defaults to `BaseAdapterException.isRetryable()` but can be overridden per-instance
 * via `retryIf()`.
 */
export abstract class RetryPolicy {
  /**
   * The maximum number of retry attempts allowed.
   */
  public abstract maxAttempts: number;

  private predicate: RetryPredicate | undefined;

  /**
   * Overrides the default retry decision for this policy instance.
   *
   * Accepts either a `RetryPredicate` instance (for complex, class-based logic)
   * or a plain function (for simple inline conditions).
   *
   * When not called, the default behaviour is to retry whenever
   * `error.isRetryable()` returns `true`.
   *
   * @param predicate - A `RetryPredicate` or `(error: BaseAdapterException) => boolean`.
   * @returns The current policy instance for method chaining.
   *
   * @example
   * ```typescript
   * // Simple function
   * RetryPolicies.exponential(3).retryIf((err) => isNetworkError(err))
   *
   * // Class-based predicate
   * RetryPolicies.exponential(3).retryIf(new BusinessRetryPredicate())
   * ```
   */
  public retryIf(predicate: RetryPredicate | ((error: BaseAdapterException) => boolean)): this {
    this.predicate = typeof predicate === 'function' ? { shouldRetry: predicate } : predicate;
    return this;
  }

  /**
   * Determines whether a retry should be attempted based on the error received.
   *
   * Delegates to the custom predicate set via `retryIf()` if present,
   * otherwise falls back to `error.isRetryable()`.
   *
   * @param error - The error encountered during the request.
   * @returns `true` if the request should be retried; otherwise `false`.
   */
  public retryOn(error: unknown): boolean {
    if (!(error instanceof BaseAdapterException)) return false;
    return this.predicate ? this.predicate.shouldRetry(error) : error.isRetryable();
  }

  /**
   * Calculates the delay in milliseconds before the next retry attempt.
   *
   * @param attempt - The current attempt number (starting from 1).
   * @returns The delay duration in milliseconds.
   */
  public abstract backoffMs(attempt: number): number;
}
