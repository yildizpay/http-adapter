import { DecorrelatedJitterPolicy } from '../../../src/resilience/policies/decorrelated-jitter.retry-policy';

describe('DecorrelatedJitterPolicy', () => {
  it('should return a delay >= baseMs', () => {
    const policy = new DecorrelatedJitterPolicy(3, 100);
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(policy.backoffMs(attempt)).toBeGreaterThanOrEqual(100);
    }
  });

  it('should never exceed maxDelayMs', () => {
    const policy = new DecorrelatedJitterPolicy(10, 100, 500);
    for (let attempt = 1; attempt <= 10; attempt++) {
      expect(policy.backoffMs(attempt)).toBeLessThanOrEqual(500);
    }
  });

  it('should use default baseMs of 100 and maxDelayMs of 30000', () => {
    const policy = new DecorrelatedJitterPolicy();
    const delay = policy.backoffMs(1);
    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('should use default maxAttempts of 3', () => {
    expect(new DecorrelatedJitterPolicy().maxAttempts).toBe(3);
  });

  it('should allow overriding maxAttempts', () => {
    expect(new DecorrelatedJitterPolicy(5).maxAttempts).toBe(5);
  });

  it('should produce different delays across calls (probabilistic)', () => {
    const policy = new DecorrelatedJitterPolicy(3, 100, 30000);
    const delays = Array.from({ length: 10 }, () => policy.backoffMs(3));
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });
});
