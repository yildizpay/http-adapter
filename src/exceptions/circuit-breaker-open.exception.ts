import { BaseAdapterException } from './base-adapter.exception';

/**
 * Exception thrown when an execution is rejected by the circuit breaker.
 *
 * Thrown in two situations:
 * - The circuit is **OPEN** — all executions are denied until `resetTimeoutMs` elapses.
 * - The circuit is **HALF_OPEN** and a probe request is already in flight — concurrent
 *   callers are rejected until the probe resolves.
 *
 * When thrown from OPEN state, `nextAttemptAt` carries the timestamp at which the circuit
 * will transition to HALF_OPEN, allowing callers to schedule a retry at the right moment.
 */
export class CircuitBreakerOpenException extends BaseAdapterException {
  /**
   * The Unix timestamp (ms) at which the circuit will allow a probe request through.
   * Is `0` when the circuit is not tracking a reset timeout (e.g. probe already in flight in HALF_OPEN).
   */
  public readonly nextAttemptAt: number;

  constructor(
    nextAttemptAt: number = 0,
    message: string = 'Circuit Breaker is OPEN. Execution denied.',
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenException';
    this.nextAttemptAt = nextAttemptAt;
    Object.setPrototypeOf(this, CircuitBreakerOpenException.prototype);
  }

  /**
   * Returns the number of milliseconds until the circuit breaker allows a probe request.
   * Returns `0` if the reset timeout has already elapsed or is not set.
   */
  public retryAfterMs(): number {
    return Math.max(0, this.nextAttemptAt - Date.now());
  }
}
