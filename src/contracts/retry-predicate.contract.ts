import { BaseAdapterException } from '../exceptions/base-adapter.exception';

/**
 * Defines a pluggable predicate for determining whether a failed request should be retried.
 *
 * Implement this interface to encapsulate complex retry conditions — for example,
 * combining `isRetryable()` with circuit state, feature flags, or domain-specific rules.
 *
 * For simple cases, a plain function `(error: BaseAdapterException) => boolean` can be
 * passed directly to `retryIf()` instead.
 *
 * @example
 * ```typescript
 * class BusinessRetryPredicate implements RetryPredicate {
 *   shouldRetry(error: BaseAdapterException): boolean {
 *     return error.isRetryable() && circuitState.isHealthy();
 *   }
 * }
 *
 * RetryPolicies.exponential(3).retryIf(new BusinessRetryPredicate())
 * ```
 */
export interface RetryPredicate {
  shouldRetry(error: BaseAdapterException): boolean;
}
