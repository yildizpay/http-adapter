import { CircuitBreakerObserver } from '../observability/circuit-breaker-observer';
import { CircuitState } from '../resilience/circuit-breaker/circuit-state.enum';

/**
 * A no-op implementation of all `CircuitBreakerObserver` hooks.
 *
 * All hooks are implemented as empty methods. Useful as a base class when only
 * a subset of hooks needs to be overridden, or as a safe stand-in for tests
 * that require a circuit breaker observer but do not care about its behaviour.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({ failureThreshold: 5 })
 *   .observe(new NoopCircuitBreakerObserver());
 * ```
 */
export class NoopCircuitBreakerObserver implements Required<CircuitBreakerObserver> {
  /**
   * Called whenever the circuit transitions between states. Does nothing.
   *
   * @param _from - The previous circuit state (unused).
   * @param _to - The new circuit state (unused).
   */
  onStateChange(_from: CircuitState, _to: CircuitState): void {}

  /**
   * Called after every successful operation execution. Does nothing.
   */
  onSuccess(): void {}

  /**
   * Called when an operation fails and the failure is counted. Does nothing.
   *
   * @param _error - The error that was counted as a failure (unused).
   */
  onFailure(_error: unknown): void {}

  /**
   * Called when a concurrent caller is rejected in HALF_OPEN state. Does nothing.
   */
  onProbeRejected(): void {}
}
