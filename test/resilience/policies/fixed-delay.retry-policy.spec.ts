import { FixedDelayPolicy } from '../../../src/resilience/policies/fixed-delay.retry-policy';

describe('FixedDelayPolicy', () => {
  it('should return the configured delay on every attempt', () => {
    const policy = new FixedDelayPolicy(3, 2000);
    expect(policy.backoffMs(1)).toBe(2000);
    expect(policy.backoffMs(2)).toBe(2000);
    expect(policy.backoffMs(3)).toBe(2000);
  });

  it('should use default delay of 1000 ms', () => {
    const policy = new FixedDelayPolicy();
    expect(policy.backoffMs(1)).toBe(1000);
  });

  it('should use default maxAttempts of 3', () => {
    expect(new FixedDelayPolicy().maxAttempts).toBe(3);
  });

  it('should allow overriding maxAttempts', () => {
    expect(new FixedDelayPolicy(5).maxAttempts).toBe(5);
  });
});
