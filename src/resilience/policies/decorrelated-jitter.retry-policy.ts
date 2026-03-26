import { RetryPolicy } from '../../contracts/retry-policy.contract';

/**
 * A retry policy that uses the decorrelated jitter algorithm.
 *
 * Wait time formula: `random(baseMs, min(maxDelayMs, baseMs * 3^attempt))`.
 * The upper bound grows with each attempt, providing a wider spread and better
 * decorrelation between concurrent clients without relying on mutable state.
 *
 * Reference: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @example
 * ```typescript
 * RetryPolicies.decorrelatedJitter(3)
 * RetryPolicies.decorrelatedJitter(3, 100, 30000) // custom base and cap
 * ```
 */
export class DecorrelatedJitterPolicy extends RetryPolicy {
  constructor(
    public maxAttempts: number = 3,
    private readonly baseMs: number = 100,
    private readonly maxDelayMs: number = 30000,
  ) {
    super();
  }

  public backoffMs(attempt: number): number {
    const cap = Math.min(this.maxDelayMs, this.baseMs * Math.pow(3, attempt));
    return Math.random() * (cap - this.baseMs) + this.baseMs;
  }
}
