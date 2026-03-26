import { ExponentialBackoffPolicy } from './policies/exponential-backoff.retry-policy';
import { FixedDelayPolicy } from './policies/fixed-delay.retry-policy';
import { LinearBackoffPolicy } from './policies/linear-backoff.retry-policy';
import { FullJitterPolicy } from './policies/full-jitter.retry-policy';
import { DecorrelatedJitterPolicy } from './policies/decorrelated-jitter.retry-policy';

/**
 * A factory class for creating standard retry policies.
 *
 * Every method returns a policy instance that can be further customised
 * with `.retryIf()` to override the default retry predicate.
 */
export class RetryPolicies {
  /**
   * Exponential backoff with light jitter.
   * Formula: `(2^attempt * 100) + random(0–50) ms`.
   *
   * @param attempts - Maximum retry attempts (default: 3).
   */
  static exponential(attempts = 3): ExponentialBackoffPolicy {
    return new ExponentialBackoffPolicy(attempts);
  }

  /**
   * Fixed delay — identical wait time between every attempt.
   *
   * @param attempts - Maximum retry attempts (default: 3).
   * @param delayMs - Wait time in milliseconds (default: 1000).
   */
  static fixedDelay(attempts = 3, delayMs = 1000): FixedDelayPolicy {
    return new FixedDelayPolicy(attempts, delayMs);
  }

  /**
   * Linear backoff — wait time grows by a fixed step each attempt.
   * Formula: `attempt * stepMs`.
   *
   * @param attempts - Maximum retry attempts (default: 3).
   * @param stepMs - Step size in milliseconds (default: 500).
   */
  static linearBackoff(attempts = 3, stepMs = 500): LinearBackoffPolicy {
    return new LinearBackoffPolicy(attempts, stepMs);
  }

  /**
   * Full jitter — fully randomised delay within an exponential cap.
   * Formula: `random(0, 2^attempt * baseMs)`.
   * Best choice for spreading load across many concurrent clients.
   *
   * @param attempts - Maximum retry attempts (default: 3).
   * @param baseMs - Base multiplier in milliseconds (default: 100).
   */
  static fullJitter(attempts = 3, baseMs = 100): FullJitterPolicy {
    return new FullJitterPolicy(attempts, baseMs);
  }

  /**
   * Decorrelated jitter — each delay is derived from the previous one.
   * Formula: `random(baseMs, prevDelay * 3)`, capped at `maxDelayMs`.
   * Provides the widest spread and best decorrelation for high-concurrency scenarios.
   *
   * @param attempts - Maximum retry attempts (default: 3).
   * @param baseMs - Minimum delay in milliseconds (default: 100).
   * @param maxDelayMs - Maximum delay cap in milliseconds (default: 30000).
   */
  static decorrelatedJitter(
    attempts = 3,
    baseMs = 100,
    maxDelayMs = 30000,
  ): DecorrelatedJitterPolicy {
    return new DecorrelatedJitterPolicy(attempts, baseMs, maxDelayMs);
  }
}
