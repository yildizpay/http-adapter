import { CircuitBreaker } from '../../../src/resilience/circuit-breaker/circuit-breaker';
import { CircuitState } from '../../../src/resilience/circuit-breaker/circuit-state.enum';
import { CircuitBreakerOpenException } from '../../../src/exceptions/circuit-breaker-open.exception';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      successThreshold: 1,
    });
  });

  describe('getState', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('execute', () => {
    it('should return result if operation succeeds', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after failureThreshold is reached', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should throw CircuitBreakerOpenException with nextAttemptAt when OPEN', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      let caughtError: unknown;
      try {
        await circuitBreaker.execute(async () => 'should not run');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(CircuitBreakerOpenException);
      expect((caughtError as CircuitBreakerOpenException).name).toBe('CircuitBreakerOpenException');
      expect((caughtError as CircuitBreakerOpenException).nextAttemptAt).toBeGreaterThan(
        Date.now(),
      );
      expect((caughtError as CircuitBreakerOpenException).retryAfterMs()).toBeGreaterThan(0);
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5000 });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      currentTime += 3000;
      expect(cb.getState()).toBe(CircuitState.OPEN);

      currentTime += 3000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      jest.restoreAllMocks();
    });

    it('should close the circuit if HALF_OPEN execution is successful', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const cb = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        successThreshold: 1,
      });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      currentTime += 2000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      jest.restoreAllMocks();
    });

    it('should reset failure count on success in CLOSED state', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      await cb.execute(async () => 'success');

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should re-open circuit if HALF_OPEN execution fails', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      currentTime += 2000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      await expect(
        cb.execute(async () => {
          throw new Error('fail2');
        }),
      ).rejects.toThrow('fail2');
      expect(cb.getState()).toBe(CircuitState.OPEN);

      jest.restoreAllMocks();
    });

    it('should respect custom isFailure predicate', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        isFailure: (err: unknown) => err instanceof Error && err.message !== 'ignore_me',
      });

      await expect(
        cb.execute(async () => {
          throw new Error('ignore_me');
        }),
      ).rejects.toThrow('ignore_me');
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      await expect(
        cb.execute(async () => {
          throw new Error('real_error');
        }),
      ).rejects.toThrow('real_error');
      expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition to CLOSED only after successThreshold is met', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const cb = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        successThreshold: 2,
      });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      currentTime += 2000;

      await cb.execute(async () => 'success1');
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      await cb.execute(async () => 'success2');
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      jest.restoreAllMocks();
    });

    it('should reject concurrent callers in HALF_OPEN while a probe is in flight', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      currentTime += 2000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      // Launch probe — does not resolve yet
      let resolveProbe!: () => void;
      const probePromise = cb.execute(
        () =>
          new Promise<string>((res) => {
            resolveProbe = () => res('ok');
          }),
      );

      // Second concurrent caller should be rejected immediately
      await expect(cb.execute(async () => 'concurrent')).rejects.toBeInstanceOf(
        CircuitBreakerOpenException,
      );

      // Resolve the probe — circuit should close
      resolveProbe();
      await expect(probePromise).resolves.toBe('ok');
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      jest.restoreAllMocks();
    });

    it('should release probe flag when HALF_OPEN probe fails', async () => {
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });

      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      currentTime += 2000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      await expect(
        cb.execute(async () => {
          throw new Error('probe fail');
        }),
      ).rejects.toThrow('probe fail');
      expect(cb.getState()).toBe(CircuitState.OPEN);

      jest.restoreAllMocks();
    });
  });
});
