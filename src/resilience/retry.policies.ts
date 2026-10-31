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
 *
 * `attempts` counts every call, including the first one: `exponential(3)` sends the
 * request at most 3 times (1 original call + 2 retries). Delay formulas use the retry
 * number `attempt`, starting at 1 for the first retry.
 */
export class RetryPolicies {
  /**
   * Exponential backoff with light jitter.
   * Formula: `(2^attempt * 100) + random(0–50) ms`.
   *
   * @param attempts - Total number of attempts including the first call (default: 3, i.e. up to 2 retries).
   */
  static exponential(attempts = 3): ExponentialBackoffPolicy {
    return new ExponentialBackoffPolicy(attempts);
  }

  /**
   * Fixed delay — identical wait time between every attempt.
   *
   * @param attempts - Total number of attempts including the first call (default: 3, i.e. up to 2 retries).
   * @param delayMs - Wait time in milliseconds (default: 1000).
   */
  static fixedDelay(attempts = 3, delayMs = 1000): FixedDelayPolicy {
    return new FixedDelayPolicy(attempts, delayMs);
  }

  /**
   * Linear backoff — wait time grows by a fixed step each attempt.
   * Formula: `attempt * stepMs`.
   *
   * @param attempts - Total number of attempts including the first call (default: 3, i.e. up to 2 retries).
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
   * @param attempts - Total number of attempts including the first call (default: 3, i.e. up to 2 retries).
   * @param baseMs - Base multiplier in milliseconds (default: 100).
   */
  static fullJitter(attempts = 3, baseMs = 100): FullJitterPolicy {
    return new FullJitterPolicy(attempts, baseMs);
  }

  /**
   * Decorrelated jitter — random delay between `baseMs` and an exponentially growing cap.
   * Formula: `random(baseMs, min(maxDelayMs, baseMs * 3^attempt))`.
   * Each delay is drawn independently (stateless variant of AWS decorrelated jitter).
   * Provides the widest spread and best decorrelation for high-concurrency scenarios.
   *
   * @param attempts - Total number of attempts including the first call (default: 3, i.e. up to 2 retries).
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
