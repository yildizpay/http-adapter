import { RetryPolicy } from '../contracts/retry-policy.contract';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { HttpAdapterObserver } from '../observability/http-adapter-observer';

/**
 * Executes an asynchronous operation with configurable retry semantics.
 *
 * The executor delegates the retry decision and backoff timing to the injected
 * {@link RetryPolicy}, allowing centralized control over transient-failure handling.
 *
 * @example
 * const executor = new RetryExecutor(myPolicy);
 * const result = await executor.execute(() => fetchUser(id));
 */
export class RetryExecutor {
  /**
   * Creates a new instance bound to the supplied retry policy and an optional observer.
   *
   * @param policy - The strategy that determines when and how retries occur.
   * @param observer - An optional observer to be notified on each retry attempt.
   */
  constructor(
    private readonly policy: RetryPolicy,
    private readonly observer?: HttpAdapterObserver,
  ) {}

  /**
   * Runs the provided asynchronous operation, retrying on failure according to
   * the configured policy.
   *
   * @template T - The type of value returned by the operation.
   * @param operation - The async function to execute.
   * @returns A promise that resolves with the first successful result or
   *          rejects with the last encountered error when retries are exhausted.
   * @throws The last error encountered if the policy prohibits further retries.
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 1;

    while (true) {
      try {
        return await operation();
      } catch (err) {
        if (!this.policy.retryOn(err)) throw err;

        if (attempt >= this.policy.maxAttempts) throw err;

        const delay = this.policy.backoffMs(attempt);

        if (this.observer?.onRetry && err instanceof BaseAdapterException) {
          this.observer.onRetry(attempt, err, delay);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));

        attempt++;
      }
    }
  }
}
