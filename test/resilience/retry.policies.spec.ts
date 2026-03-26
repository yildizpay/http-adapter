import { RetryPolicies } from '../../src/resilience/retry.policies';
import { ExponentialBackoffPolicy } from '../../src/resilience/policies/exponential-backoff.retry-policy';
import { FixedDelayPolicy } from '../../src/resilience/policies/fixed-delay.retry-policy';
import { LinearBackoffPolicy } from '../../src/resilience/policies/linear-backoff.retry-policy';
import { FullJitterPolicy } from '../../src/resilience/policies/full-jitter.retry-policy';
import { DecorrelatedJitterPolicy } from '../../src/resilience/policies/decorrelated-jitter.retry-policy';

describe('RetryPolicies', () => {
  it('should return an ExponentialBackoffPolicy', () => {
    expect(RetryPolicies.exponential(3)).toBeInstanceOf(ExponentialBackoffPolicy);
  });

  it('should use default attempts for exponential', () => {
    expect(RetryPolicies.exponential()).toBeInstanceOf(ExponentialBackoffPolicy);
  });

  it('should return a FixedDelayPolicy', () => {
    expect(RetryPolicies.fixedDelay(3, 500)).toBeInstanceOf(FixedDelayPolicy);
  });

  it('should use defaults for fixedDelay', () => {
    expect(RetryPolicies.fixedDelay()).toBeInstanceOf(FixedDelayPolicy);
  });

  it('should return a LinearBackoffPolicy', () => {
    expect(RetryPolicies.linearBackoff(3, 200)).toBeInstanceOf(LinearBackoffPolicy);
  });

  it('should use defaults for linearBackoff', () => {
    expect(RetryPolicies.linearBackoff()).toBeInstanceOf(LinearBackoffPolicy);
  });

  it('should return a FullJitterPolicy', () => {
    expect(RetryPolicies.fullJitter(3, 100)).toBeInstanceOf(FullJitterPolicy);
  });

  it('should use defaults for fullJitter', () => {
    expect(RetryPolicies.fullJitter()).toBeInstanceOf(FullJitterPolicy);
  });

  it('should return a DecorrelatedJitterPolicy', () => {
    expect(RetryPolicies.decorrelatedJitter(3, 100, 30000)).toBeInstanceOf(
      DecorrelatedJitterPolicy,
    );
  });

  it('should use defaults for decorrelatedJitter', () => {
    expect(RetryPolicies.decorrelatedJitter()).toBeInstanceOf(DecorrelatedJitterPolicy);
  });
});
