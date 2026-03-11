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
      // First failure
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // Second failure (reaches threshold of 2)
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should throw CircuitBreakerOpenException when OPEN', async () => {
      // Trip the breaker
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

      // Subsequent call should immediately throw CircuitBreakerOpenException
      let exceptionCaught = false;
      try {
        await circuitBreaker.execute(async () => 'should not run');
      } catch (err) {
        exceptionCaught = true;
        expect(err).toBeInstanceOf(CircuitBreakerOpenException);
        expect((err as Error).name).toBe('CircuitBreakerOpenException');
      }
      expect(exceptionCaught).toBe(true);
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      // Mock Date.now to control time
      let currentTime = 10000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Create a breaker with a fake timeout
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5000 });

      // Trip the breaker
      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Time passes, but not enough
      currentTime += 3000;
      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Time passes, exceeds resetTimeMs
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

      // Trip it
      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Wait for it to become HALF_OPEN
      currentTime += 2000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      // Execute successfully
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      jest.restoreAllMocks();
    });

    it('should test success reset inside CLOSED', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      // Fail once
      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      // Succeed once, should reset failure count
      await cb.execute(async () => 'success');

      // Fail once again (should not trip since previous success reset the count)
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

      // Trip it
      await expect(
        cb.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();
      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Wait for HALF_OPEN
      currentTime += 2000;
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      // Execute failing call, should trip again
      await expect(
        cb.execute(async () => {
          throw new Error('fail2');
        }),
      ).rejects.toThrow('fail2');
      expect(cb.getState()).toBe(CircuitState.OPEN);

      jest.restoreAllMocks();
    });

    it('should successfully pass custom isFailure predicate', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        isFailure: (err: any) => err.message !== 'ignore_me',
      });

      // This failure should be ignored by the predicate
      await expect(
        cb.execute(async () => {
          throw new Error('ignore_me');
        }),
      ).rejects.toThrow('ignore_me');

      // Circuit should remain CLOSED
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      // This failure should be recognized
      await expect(
        cb.execute(async () => {
          throw new Error('real_error');
        }),
      ).rejects.toThrow('real_error');

      // Circuit should trip
      expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition to CLOSED if successThreshold is > 1', async () => {
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

      // 1st success
      await cb.execute(async () => 'success1');
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN); // not closed yet

      // 2nd success
      await cb.execute(async () => 'success2');
      expect(cb.getState()).toBe(CircuitState.CLOSED); // now it is closed

      jest.restoreAllMocks();
    });
  });
});
