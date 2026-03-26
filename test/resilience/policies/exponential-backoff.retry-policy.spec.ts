import { ExponentialBackoffPolicy } from '../../../src/resilience/policies/exponential-backoff.retry-policy';

describe('ExponentialBackoffPolicy', () => {
  let policy: ExponentialBackoffPolicy;

  beforeEach(() => {
    policy = new ExponentialBackoffPolicy();
  });

  describe('backoffMs', () => {
    it('should return delay within expected range for attempt 1', () => {
      const delay = policy.backoffMs(1);
      expect(delay).toBeGreaterThanOrEqual(200);
      expect(delay).toBeLessThanOrEqual(250);
    });

    it('should return delay within expected range for attempt 2', () => {
      const delay = policy.backoffMs(2);
      expect(delay).toBeGreaterThanOrEqual(400);
      expect(delay).toBeLessThanOrEqual(450);
    });

    it('should return delay within expected range for attempt 3', () => {
      const delay = policy.backoffMs(3);
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(850);
    });
  });

  describe('constructor', () => {
    it('should set default maxAttempts to 3', () => {
      expect(policy.maxAttempts).toBe(3);
    });

    it('should allow overriding maxAttempts', () => {
      expect(new ExponentialBackoffPolicy(5).maxAttempts).toBe(5);
    });
  });
});
