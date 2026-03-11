import { CircuitState } from './circuit-state.enum';
import { CircuitBreakerOptions } from './circuit-breaker-options';
import { CircuitBreakerOpenException } from '../../exceptions/circuit-breaker-open.exception';

/**
 * A classic Circuit Breaker implementation using State machine transitions.
 * Wraps around an asynchronous operation to prevent cascading failures in S2S communication.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptAt: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly isFailurePredicate: (error: unknown) => boolean;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 60000;
    this.successThreshold = options?.successThreshold ?? 1;
    this.isFailurePredicate = options?.isFailure ?? (() => true); // Default to treating any error as a failure
  }

  /**
   * Inspects and returns the current state.
   * Transitions from OPEN to HALF_OPEN if the reset timeout has expired.
   */
  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttemptAt) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
    return this.state;
  }

  /**
   * Dispatches the operation if the circuit is CLOSED or HALF_OPEN.
   * Immediately throws an exception if the circuit is OPEN.
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      throw new CircuitBreakerOpenException();
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
    }
  }

  private recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      // Must be CLOSED since we can't execute in OPEN state
      // Reset failure count on a successful call
      this.failureCount = 0;
    }
  }

  private recordFailure(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    } else {
      // Must be CLOSED
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    if (newState === CircuitState.OPEN) {
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.failureCount = 0;
      this.successCount = 0;
    } else {
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttemptAt = 0;
    }
  }
}
