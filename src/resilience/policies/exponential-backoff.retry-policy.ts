import { RetryPolicy } from '../../contracts/retry-policy.contract';

/**
 * A retry policy that uses exponential backoff with added jitter.
 *
 * Wait time formula: `(2^attempt * 100) + random(0–50) ms`.
 * The jitter prevents thundering herd problems when many clients retry simultaneously.
 */
export class ExponentialBackoffPolicy extends RetryPolicy {
  constructor(public maxAttempts: number = 3) {
    super();
  }

  public backoffMs(attempt: number): number {
    const base = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return base + jitter;
  }
}
