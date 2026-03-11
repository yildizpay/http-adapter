export interface CircuitBreakerOptions {
  /**
   * The number of consecutive failures before the circuit opens.
   * @default 5
   */
  failureThreshold?: number;

  /**
   * The duration (in milliseconds) the circuit stays OPEN before transitioning to HALF_OPEN.
   * @default 60000 (60 seconds)
   */
  resetTimeoutMs?: number;

  /**
   * The number of successful executions required in HALF_OPEN state to close the circuit.
   * @default 1
   */
  successThreshold?: number;

  /**
   * A function to determine if a caught error should be considered a failure by the circuit breaker.
   * By default, all errors thrown by the operation are considered failures.
   */
  isFailure?: (error: unknown) => boolean;
}
