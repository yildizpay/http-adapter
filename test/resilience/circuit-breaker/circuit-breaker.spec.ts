import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreakerOpenException } from '../../../src/exceptions/circuit-breaker-open.exception';
import { CircuitBreaker } from '../../../src/resilience/circuit-breaker/circuit-breaker';
import { CircuitState } from '../../../src/resilience/circuit-breaker/circuit-state.enum';

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
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

      vi.restoreAllMocks();
    });

    it('should close the circuit if HALF_OPEN execution is successful', async () => {
      let currentTime = 10000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

      vi.restoreAllMocks();
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
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

      vi.restoreAllMocks();
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
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

      vi.restoreAllMocks();
    });

    it('should reject concurrent callers in HALF_OPEN while a probe is in flight', async () => {
      let currentTime = 10000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

      vi.restoreAllMocks();
    });

    it('should release probe flag when HALF_OPEN probe fails', async () => {
      let currentTime = 10000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

      vi.restoreAllMocks();
    });
  });

  describe('stale completions', () => {
    const deferred = <T>() => {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
    const fail = () =>
      circuitBreaker.execute(async () => {
        throw new Error('fail');
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not let a request admitted while CLOSED release the HALF_OPEN probe slot', async () => {
      const slow = deferred<string>();
      const slowCall = circuitBreaker.execute(() => slow.promise);

      await fail().catch(() => undefined);
      await fail().catch(() => undefined);
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      vi.advanceTimersByTime(1000);
      const probe = deferred<string>();
      const probeCall = circuitBreaker.execute(() => probe.promise);
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      slow.resolve('late');
      await expect(slowCall).resolves.toBe('late');

      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      await expect(circuitBreaker.execute(async () => 'second probe')).rejects.toBeInstanceOf(
        CircuitBreakerOpenException,
      );

      probe.reject(new Error('still down'));
      await expect(probeCall).rejects.toThrow('still down');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should not let a late failure re-open or extend an OPEN circuit', async () => {
      const slow = deferred<string>();
      const slowCall = circuitBreaker.execute(() => slow.promise);

      await fail().catch(() => undefined);
      await fail().catch(() => undefined);
      vi.advanceTimersByTime(1000);
      await circuitBreaker.execute(async () => 'recovered');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      slow.reject(new Error('late failure'));
      await expect(slowCall).rejects.toThrow('late failure');

      await fail().catch(() => undefined);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should not notify the observer about stale outcomes', async () => {
      const observer = { onSuccess: vi.fn(), onFailure: vi.fn() };
      circuitBreaker.observe(observer);
      const slow = deferred<string>();
      const slowCall = circuitBreaker.execute(() => slow.promise);

      await fail().catch(() => undefined);
      await fail().catch(() => undefined);
      observer.onFailure.mockClear();

      slow.resolve('late');
      await slowCall;

      expect(observer.onSuccess).not.toHaveBeenCalled();
      expect(observer.onFailure).not.toHaveBeenCalled();
    });
  });
});
