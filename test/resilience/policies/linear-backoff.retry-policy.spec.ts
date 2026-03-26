import { LinearBackoffPolicy } from '../../../src/resilience/policies/linear-backoff.retry-policy';

describe('LinearBackoffPolicy', () => {
  it('should return attempt * stepMs on each attempt', () => {
    const policy = new LinearBackoffPolicy(3, 500);
    expect(policy.backoffMs(1)).toBe(500);
    expect(policy.backoffMs(2)).toBe(1000);
    expect(policy.backoffMs(3)).toBe(1500);
  });

  it('should use default stepMs of 500', () => {
    const policy = new LinearBackoffPolicy();
    expect(policy.backoffMs(2)).toBe(1000);
  });

  it('should use default maxAttempts of 3', () => {
    expect(new LinearBackoffPolicy().maxAttempts).toBe(3);
  });

  it('should allow overriding maxAttempts', () => {
    expect(new LinearBackoffPolicy(5).maxAttempts).toBe(5);
  });
});
