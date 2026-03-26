import { CircuitState } from './circuit-state.enum';
import { CircuitBreakerOptions } from './circuit-breaker-options';
import { CircuitBreakerOpenException } from '../../exceptions/circuit-breaker-open.exception';

/**
 * A classic Circuit Breaker implementation using a three-state machine (CLOSED → OPEN → HALF_OPEN).
 * Wraps around an asynchronous operation to prevent cascading failures in S2S communication.
 *
 * ## State transitions
 *
 * - **CLOSED** — Normal operation. Failures are counted; once `failureThreshold` consecutive
 *   failures are recorded the circuit trips to OPEN.
 * - **OPEN** — All executions are rejected immediately with `CircuitBreakerOpenException`.
 *   After `resetTimeoutMs` the circuit transitions to HALF_OPEN on the next `execute()` call.
 * - **HALF_OPEN** — A single probe request is allowed through to test whether the downstream
 *   service has recovered. All other concurrent calls are rejected while the probe is in flight.
 *   A successful probe increments `successCount`; once `successThreshold` successes are reached
 *   the circuit closes. Any failure sends the circuit back to OPEN immediately.
 *
 * ## Why only one probe in HALF_OPEN?
 *
 * Node.js runs on a single-threaded event loop, but `async/await` introduces cooperative
 * multitasking: while one coroutine is suspended at an `await`, the event loop is free to
 * start other coroutines. Without a guard, every request that arrives during HALF_OPEN would
 * read the same state and proceed concurrently — potentially overwhelming a service that has
 * only just started to recover. The probe flag (`halfOpenProbeInFlight`) acts as a lightweight
 * semaphore: only the first caller gets the probe slot; all subsequent callers are rejected with
 * `CircuitBreakerOpenException` until the probe resolves.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptAt: number = 0;
  private halfOpenProbeInFlight: boolean = false;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly isFailurePredicate: (error: unknown) => boolean;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 60000;
    this.successThreshold = options?.successThreshold ?? 1;
    this.isFailurePredicate = options?.isFailure ?? (() => true);
  }

  /**
   * Inspects and returns the current state.
   * Transitions from OPEN to HALF_OPEN if the reset timeout has expired.
   */
  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptAt) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
    return this.state;
  }

  /**
   * Executes the given operation if the circuit permits it.
   *
   * - **CLOSED**: operation runs normally.
   * - **OPEN**: throws `CircuitBreakerOpenException` immediately without calling the operation.
   * - **HALF_OPEN**: only the first concurrent caller is allowed through as a probe.
   *   All other concurrent callers receive `CircuitBreakerOpenException` while the probe
   *   is in flight. This prevents a recovering service from being overwhelmed by a burst
   *   of simultaneous requests the moment the reset timeout expires.
   *
   * @throws {CircuitBreakerOpenException} When the circuit is OPEN or a probe is already in flight.
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      throw new CircuitBreakerOpenException(this.nextAttemptAt);
    }

    if (currentState === CircuitState.HALF_OPEN) {
      if (this.halfOpenProbeInFlight)
        throw new CircuitBreakerOpenException(
          0,
          'Circuit Breaker is HALF_OPEN. A probe request is already in flight.',
        );
      this.halfOpenProbeInFlight = true;
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      if (this.isFailurePredicate(error)) {
        this.recordFailure();
      }
      throw error;
    } finally {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenProbeInFlight = false;
      }
    }
  }

  private recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private recordFailure(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    } else {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenProbeInFlight = false;
    this.nextAttemptAt = newState === CircuitState.OPEN ? Date.now() + this.resetTimeoutMs : 0;
  }
}
