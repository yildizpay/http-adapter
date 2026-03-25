import { RetryPolicies } from '../../src/resilience/retry.policies';
import { ExponentialBackoffPolicy } from '../../src/resilience/policies/exponential-backoff.retry-policy';

describe('RetryPolicies', () => {
  describe('exponential', () => {
    it('should return an ExponentialBackoffPolicy instance', () => {
      expect(RetryPolicies.exponential(3)).toBeInstanceOf(ExponentialBackoffPolicy);
    });

    it('should use the default attempts value when called with no arguments', () => {
      expect(RetryPolicies.exponential()).toBeInstanceOf(ExponentialBackoffPolicy);
    });
  });
});
