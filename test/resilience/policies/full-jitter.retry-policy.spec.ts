import { FullJitterPolicy } from '../../../src/resilience/policies/full-jitter.retry-policy';

describe('FullJitterPolicy', () => {
  it('should return a delay within [0, 2^attempt * baseMs]', () => {
    const policy = new FullJitterPolicy(3, 100);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const delay = policy.backoffMs(attempt);
      const cap = Math.pow(2, attempt) * 100;
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(cap);
    }
  });

  it('should use default baseMs of 100', () => {
    const policy = new FullJitterPolicy();
    const delay = policy.backoffMs(1);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThan(200);
  });

  it('should use default maxAttempts of 3', () => {
    expect(new FullJitterPolicy().maxAttempts).toBe(3);
  });

  it('should allow overriding maxAttempts', () => {
    expect(new FullJitterPolicy(5).maxAttempts).toBe(5);
  });

  it('should produce different delays across calls (probabilistic)', () => {
    const policy = new FullJitterPolicy(3, 100);
    const delays = Array.from({ length: 10 }, () => policy.backoffMs(3));
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });
});
