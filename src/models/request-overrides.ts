import { RetryPolicy } from '../contracts/retry-policy.contract';
import { CircuitBreaker } from '../resilience/circuit-breaker/circuit-breaker';

/**
 * A constructor type used exclusively for `instanceof` checks when excluding interceptors by class.
 *
 * The `any` spread is intentional — we never call this constructor, only use it for type narrowing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InterceptorClass = abstract new (...args: any[]) => object;

/**
 * Per-request overrides for the adapter's global retry, circuit breaker, and interceptor configuration.
 *
 * - `undefined` — no override; the adapter's global config is used.
 * - `null` — explicitly disabled for this request.
 * - a value — replaces the adapter's global config for this request only.
 */
export interface RequestOverrides {
  /**
   * Overrides the adapter's global retry policy for this request.
   * Set to `null` to disable retries entirely for this request.
   */
  retryPolicy?: RetryPolicy | null;

  /**
   * Overrides the adapter's global circuit breaker for this request.
   * Set to `null` to bypass the circuit breaker entirely for this request.
   */
  circuitBreaker?: CircuitBreaker | null;

  /**
   * Interceptor classes to exclude for this request.
   * All instances of each provided class will be skipped.
   *
   * @see {@link RequestOverrides.excludedInterceptorInstances} to exclude a specific instance.
   */
  excludedInterceptors?: InterceptorClass[];

  /**
   * Specific interceptor instances to exclude for this request.
   * Only the exact provided instances will be skipped.
   */
  excludedInterceptorInstances?: object[];
}
