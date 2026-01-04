import { ExponentialBackoffPolicy } from '../../../src/resilience/policies/exponential-backoff.retry-policy';

describe('ExponentialBackoffPolicy', () => {
  let policy: ExponentialBackoffPolicy;

  beforeEach(() => {
    policy = new ExponentialBackoffPolicy();
  });

  describe('retryOn', () => {
    const retryableErrors = [
      { response: { status: 429 } },
      { response: { status: 500 } },
      { response: { status: 502 } },
      { response: { status: 503 } },
      { response: { status: 504 } },
      { code: 'ECONNABORTED' },
    ];

    const nonRetryableErrors = [
      { response: { status: 400 } },
      { response: { status: 401 } },
      { response: { status: 403 } },
      { response: { status: 404 } },
      { code: 'OTHER_ERROR' },
      new Error('Generic error'),
    ];

    retryableErrors.forEach((error) => {
      it(`should return true for error: ${JSON.stringify(error)}`, () => {
        expect(policy.retryOn(error)).toBe(true);
      });
    });

    nonRetryableErrors.forEach((error) => {
      it(`should return false for error: ${JSON.stringify(error)}`, () => {
        expect(policy.retryOn(error)).toBe(false);
      });
    });
  });

  describe('backoffMs', () => {
    it('should calculate delay within expected range for attempt 1', () => {
      const delay = policy.backoffMs(1);
      // (2^1 * 100) = 200 + [0-50] jitter
      expect(delay).toBeGreaterThanOrEqual(200);
      expect(delay).toBeLessThanOrEqual(250);
    });

    it('should calculate delay within expected range for attempt 2', () => {
      const delay = policy.backoffMs(2);
      // (2^2 * 100) = 400 + [0-50] jitter
      expect(delay).toBeGreaterThanOrEqual(400);
      expect(delay).toBeLessThanOrEqual(450);
    });

    it('should calculate delay within expected range for attempt 3', () => {
      const delay = policy.backoffMs(3);
      // (2^3 * 100) = 800 + [0-50] jitter
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(850);
    });
  });

  describe('constructor', () => {
    it('should set default maxAttempts to 3', () => {
      expect(policy.maxAttempts).toBe(3);
    });

    it('should allow overriding maxAttempts', () => {
      const customPolicy = new ExponentialBackoffPolicy(5);
      expect(customPolicy.maxAttempts).toBe(5);
    });
  });
});
