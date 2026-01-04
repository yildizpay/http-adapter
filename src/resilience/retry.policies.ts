import { ExponentialBackoffPolicy } from "./policies/exponential-backoff.retry-policy";

/**
 * A factory class for creating standard retry policies.
 *
 * Provides static methods to easily instantiate common retry strategies without
 * needing to manually construct policy classes.
 */
export class RetryPolicies {
  /**
   * Creates an exponential backoff retry policy.
   *
   * @param attempts - The maximum number of retry attempts (default: 3).
   * @returns A new instance of `ExponentialBackoffPolicy`.
   */
  static exponential(attempts = 3) {
    return new ExponentialBackoffPolicy(attempts);
  }
}
