import { NoopCircuitBreakerObserver } from '../../src/testing/noop-circuit-breaker-observer';
import { CircuitState } from '../../src/resilience/circuit-breaker/circuit-state.enum';

describe('NoopCircuitBreakerObserver', () => {
  let observer: NoopCircuitBreakerObserver;

  beforeEach(() => {
    observer = new NoopCircuitBreakerObserver();
  });

  it('should not throw when onStateChange is called', () => {
    expect(() => observer.onStateChange(CircuitState.CLOSED, CircuitState.OPEN)).not.toThrow();
  });

  it('should not throw when onSuccess is called', () => {
    expect(() => observer.onSuccess()).not.toThrow();
  });

  it('should not throw when onFailure is called', () => {
    expect(() => observer.onFailure(new Error('boom'))).not.toThrow();
  });

  it('should not throw when onProbeRejected is called', () => {
    expect(() => observer.onProbeRejected()).not.toThrow();
  });
});
