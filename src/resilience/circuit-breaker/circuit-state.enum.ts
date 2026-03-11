/**
 * Represents the possible states of a Circuit Breaker.
 */
export enum CircuitState {
  /**
   * Normal operation. Requests are allowed through.
   */
  CLOSED = 'CLOSED',

  /**
   * System is failing. Requests are immediately rejected without attempting the call.
   */
  OPEN = 'OPEN',

  /**
   * Recovery mechanism. A limited number of requests are allowed through to see if the system has recovered.
   */
  HALF_OPEN = 'HALF_OPEN',
}
