import { RetryPolicy } from '../../contracts/retry-policy.contract';

/**
 * A retry policy that waits a fixed amount of time between every attempt.
 *
 * Suitable for predictable, low-frequency retry scenarios where a constant
 * cooldown period is preferred over increasing delays.
 *
 * @example
 * ```typescript
 * RetryPolicies.fixedDelay(3, 1000) // 3 attempts, 1 s between each
 * ```
 */
export class FixedDelayPolicy extends RetryPolicy {
  constructor(
    public maxAttempts: number = 3,
    private readonly delayMs: number = 1000,
  ) {
    super();
  }

  public backoffMs(_attempt: number): number {
    return this.delayMs;
  }
}
