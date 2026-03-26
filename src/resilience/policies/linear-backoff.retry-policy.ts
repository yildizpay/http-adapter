import { RetryPolicy } from '../../contracts/retry-policy.contract';

/**
 * A retry policy that increases the wait time linearly with each attempt.
 *
 * Wait time formula: `attempt * stepMs`.
 *
 * @example
 * ```typescript
 * RetryPolicies.linearBackoff(3, 500) // 500 ms, 1000 ms, 1500 ms
 * ```
 */
export class LinearBackoffPolicy extends RetryPolicy {
  constructor(
    public maxAttempts: number = 3,
    private readonly stepMs: number = 500,
  ) {
    super();
  }

  public backoffMs(attempt: number): number {
    return attempt * this.stepMs;
  }
}
