import { CircuitState } from '../resilience/circuit-breaker/circuit-state.enum';

/**
 * A read-only observer for `CircuitBreaker` state and execution events.
 *
 * Attach via the fluent `.observe()` method on a `CircuitBreaker` instance —
 * consistent with the `.retryIf()` pattern on retry policies.
 *
 * All hooks are optional; implement only the events you need.
 *
 * @example
 * ```typescript
 * class CircuitMetricsObserver implements CircuitBreakerObserver {
 *   onStateChange(from: CircuitState, to: CircuitState): void {
 *     logger.warn(`Circuit breaker: ${from} → ${to}`);
 *     metrics.increment('circuit_breaker.state_change', { from, to });
 *   }
 *
 *   onProbeRejected(): void {
 *     metrics.increment('circuit_breaker.probe_rejected');
 *   }
 * }
 *
 * const breaker = new CircuitBreaker({ failureThreshold: 5 })
 *   .observe(new CircuitMetricsObserver());
 * ```
 */
export interface CircuitBreakerObserver {
  /**
   * Called whenever the circuit transitions between states.
   *
   * Possible transitions:
   * - CLOSED → OPEN (failure threshold reached)
   * - OPEN → HALF_OPEN (reset timeout elapsed)
   * - HALF_OPEN → CLOSED (success threshold met)
   * - HALF_OPEN → OPEN (probe failed)
   *
   * @param from - The previous circuit state.
   * @param to - The new circuit state.
   */
  onStateChange?(from: CircuitState, to: CircuitState): void;

  /**
   * Called after every successful operation execution, regardless of circuit state.
   */
  onSuccess?(): void;

  /**
   * Called when an operation fails and the failure is counted by the circuit breaker
   * (i.e. the `isFailure` predicate returned `true`).
   *
   * @param error - The error that was counted as a failure.
   */
  onFailure?(error: unknown): void;

  /**
   * Called when a concurrent caller is rejected in HALF_OPEN state because a probe
   * request is already in flight.
   *
   * Useful for tracking how often concurrent requests are turned away during recovery.
   */
  onProbeRejected?(): void;
}
