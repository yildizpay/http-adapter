import { CircuitBreaker } from '../../src/resilience/circuit-breaker/circuit-breaker';
import { CircuitState } from '../../src/resilience/circuit-breaker/circuit-state.enum';
import { CircuitBreakerOpenException } from '../../src/exceptions/circuit-breaker-open.exception';

const fail = () => {
  throw new Error('fail');
};

describe('CircuitBreakerObserver', () => {
  describe('onStateChange', () => {
    it('should fire CLOSED → OPEN when failure threshold is reached', async () => {
      const changes: Array<{ from: CircuitState; to: CircuitState }> = [];
      const cb = new CircuitBreaker({ failureThreshold: 1 }).observe({
        onStateChange: (from, to) => changes.push({ from, to }),
      });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      expect(changes).toEqual([{ from: CircuitState.CLOSED, to: CircuitState.OPEN }]);
    });

    it('should fire OPEN → HALF_OPEN after reset timeout', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const changes: Array<{ from: CircuitState; to: CircuitState }> = [];
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 }).observe({
        onStateChange: (from, to) => changes.push({ from, to }),
      });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      currentTime += 2000;
      cb.getState();

      expect(changes).toContainEqual({ from: CircuitState.OPEN, to: CircuitState.HALF_OPEN });
      jest.restoreAllMocks();
    });

    it('should fire HALF_OPEN → CLOSED when probe succeeds', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const changes: Array<{ from: CircuitState; to: CircuitState }> = [];
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 }).observe({
        onStateChange: (from, to) => changes.push({ from, to }),
      });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      currentTime += 2000;
      await cb.execute(async () => 'ok');

      expect(changes).toContainEqual({ from: CircuitState.HALF_OPEN, to: CircuitState.CLOSED });
      jest.restoreAllMocks();
    });

    it('should fire HALF_OPEN → OPEN when probe fails', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const changes: Array<{ from: CircuitState; to: CircuitState }> = [];
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 }).observe({
        onStateChange: (from, to) => changes.push({ from, to }),
      });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      currentTime += 2000;
      await expect(cb.execute(async () => fail())).rejects.toThrow();

      expect(changes).toContainEqual({ from: CircuitState.HALF_OPEN, to: CircuitState.OPEN });
      jest.restoreAllMocks();
    });
  });

  describe('onSuccess', () => {
    it('should fire after every successful execution', async () => {
      const onSuccess = jest.fn();
      const cb = new CircuitBreaker().observe({ onSuccess });

      await cb.execute(async () => 'ok');
      await cb.execute(async () => 'ok');
      expect(onSuccess).toHaveBeenCalledTimes(2);
    });

    it('should not fire when operation fails', async () => {
      const onSuccess = jest.fn();
      const cb = new CircuitBreaker({ failureThreshold: 5 }).observe({ onSuccess });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('onFailure', () => {
    it('should fire with the error when isFailure predicate returns true', async () => {
      const onFailure = jest.fn();
      const cb = new CircuitBreaker({ failureThreshold: 5 }).observe({ onFailure });

      const err = new Error('fail');
      await expect(
        cb.execute(async () => {
          throw err;
        }),
      ).rejects.toThrow();
      expect(onFailure).toHaveBeenCalledWith(err);
    });

    it('should not fire when isFailure predicate returns false', async () => {
      const onFailure = jest.fn();
      const cb = new CircuitBreaker({
        failureThreshold: 5,
        isFailure: () => false,
      }).observe({ onFailure });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      expect(onFailure).not.toHaveBeenCalled();
    });
  });

  describe('onProbeRejected', () => {
    it('should fire when a concurrent caller is rejected in HALF_OPEN', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const onProbeRejected = jest.fn();
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 }).observe({
        onProbeRejected,
      });

      await expect(cb.execute(async () => fail())).rejects.toThrow();
      currentTime += 2000;

      let resolveProbe!: () => void;
      const probePromise = cb.execute(
        () =>
          new Promise<string>((res) => {
            resolveProbe = () => res('ok');
          }),
      );

      await expect(cb.execute(async () => 'concurrent')).rejects.toBeInstanceOf(
        CircuitBreakerOpenException,
      );
      expect(onProbeRejected).toHaveBeenCalledTimes(1);

      resolveProbe();
      await probePromise;
      jest.restoreAllMocks();
    });
  });

  describe('observe() chaining', () => {
    it('should return the CircuitBreaker instance for fluent chaining', () => {
      const cb = new CircuitBreaker();
      const result = cb.observe({});
      expect(result).toBe(cb);
    });
  });
});
