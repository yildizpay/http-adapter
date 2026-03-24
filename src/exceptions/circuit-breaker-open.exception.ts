import { BaseAdapterException } from './base-adapter.exception';

/**
 * Exception thrown when an execution is attempted while the circuit breaker is OPEN.
 */
export class CircuitBreakerOpenException extends BaseAdapterException {
  constructor(message: string = 'Circuit Breaker is OPEN. Execution denied.') {
    super(message);
    this.name = 'CircuitBreakerOpenException';
    Object.setPrototypeOf(this, CircuitBreakerOpenException.prototype);
  }
}
