import { HttpException } from './http.exception';

/**
 * Exception thrown when an execution is attempted while the circuit breaker is OPEN.
 */
export class CircuitBreakerOpenException extends HttpException {
  constructor(message: string = 'Circuit Breaker is OPEN. Execution denied.') {
    super(message, null);
    this.name = 'CircuitBreakerOpenException';
    Object.setPrototypeOf(this, CircuitBreakerOpenException.prototype);
  }
}
