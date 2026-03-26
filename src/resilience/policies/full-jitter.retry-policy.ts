import { RetryPolicy } from '../../contracts/retry-policy.contract';

/**
 * A retry policy that uses exponential backoff with full jitter.
 *
 * Wait time formula: `random(0, 2^attempt * baseMs)`.
 * The delay is fully randomised within the exponential cap, which provides
 * the best spread when many clients retry simultaneously.
 *
 * Reference: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @example
 * ```typescript
 * RetryPolicies.fullJitter(3)
 * RetryPolicies.fullJitter(3, 200) // custom base
 * ```
 */
export class FullJitterPolicy extends RetryPolicy {
  constructor(
    public maxAttempts: number = 3,
    private readonly baseMs: number = 100,
  ) {
    super();
  }

  public backoffMs(attempt: number): number {
    const cap = Math.pow(2, attempt) * this.baseMs;
    return Math.random() * cap;
  }
}
