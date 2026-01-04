import { RetryPolicy } from "../contracts/retry-policy.contract";

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
   * Creates a new instance bound to the supplied retry policy.
   *
   * @param policy - The strategy that determines when and how retries occur.
   */
  constructor(private readonly policy: RetryPolicy) {}

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
        // Operation succeeded; return its result immediately.
        return await operation();
      } catch (err) {
        // Policy indicates the error is non-retryable; propagate it.
        if (!this.policy.retryOn(err)) throw err;

        // Maximum retry attempts reached; propagate the final error.
        if (attempt >= this.policy.maxAttempts) throw err;

        // Compute backoff delay before the next attempt.
        const delay = this.policy.backoffMs(attempt);

        // Pause execution for the computed delay.
        await new Promise((resolve) => setTimeout(resolve, delay));

        attempt++;
      }
    }
  }
}
