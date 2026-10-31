import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import type { RetryPredicate } from './retry-predicate.contract';
import { SocketResetException } from '../exceptions/network.exceptions';
import { HttpMethod } from '../common/enums/http-method.enum';

/** Methods that are idempotent by definition (RFC 9110 §9.2.2). */
const IDEMPOTENT_METHODS = new Set<string>([
  HttpMethod.GET,
  HttpMethod.HEAD,
  HttpMethod.OPTIONS,
  HttpMethod.PUT,
  HttpMethod.DELETE,
]);

/**
 * Information about the request being retried.
 */
export interface RetryContext {
  /** The HTTP method of the request. */
  method: HttpMethod;
}

/**
 * Defines the contract for an HTTP retry policy.
 *
 * Subclasses implement the backoff timing strategy (`backoffMs`). The retry decision
 * defaults to `BaseAdapterException.isRetryable()` but can be overridden per-instance
 * via `retryIf()`.
 */
export abstract class RetryPolicy {
  /**
   * The maximum number of attempts, including the first call (`3` = 1 call + 2 retries).
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
   * Without a custom predicate, a {@link SocketResetException} is not retried for
   * non-idempotent methods (POST, PATCH): the connection may have dropped after the
   * server processed the request, so sending it again could duplicate it (e.g. charge
   * a card twice).
   *
   * @param error - The error encountered during the request.
   * @param context - Information about the request, when available.
   * @returns `true` if the request should be retried; otherwise `false`.
   */
  public retryOn(error: unknown, context?: RetryContext): boolean {
    if (!(error instanceof BaseAdapterException)) return false;
    if (this.predicate) return this.predicate.shouldRetry(error);
    if (!error.isRetryable()) return false;
    return !(
      context &&
      error instanceof SocketResetException &&
      !IDEMPOTENT_METHODS.has(context.method)
    );
  }

  /**
   * Calculates the delay in milliseconds before the next retry attempt.
   *
   * @param attempt - The current attempt number (starting from 1).
   * @returns The delay duration in milliseconds.
   */
  public abstract backoffMs(attempt: number): number;
}
