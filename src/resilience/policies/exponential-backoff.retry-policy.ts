import { RetryPolicy } from '../../contracts/retry-policy.contract';

/**
 * Represents an error encountered during an HTTP request, providing details
 * about the failure such as status codes or network error identifiers.
 */
interface HttpNetworkError {
  /**
   * An optional error code indicating the type of network failure, such as 'ECONNABORTED'.
   */
  code?: string;

  /**
   * The response object received from the server, if the request reached the server.
   */
  response?: {
    /**
     * The HTTP status code returned by the server (e.g., 429, 500, 503).
     */
    status?: number;
  };
}

/**
 * A retry policy that implements an exponential backoff strategy.
 *
 * This strategy increases the wait time between retries exponentially (2^attempt)
 * to reduce load on the failing service. It also includes a random jitter to prevent
 * thundering herd problems.
 */
export class ExponentialBackoffPolicy extends RetryPolicy {
  /**
   * Initializes a new instance of the ExponentialBackoffPolicy class.
   *
   * @param maxAttempts - The maximum number of retry attempts (default: 3).
   */
  constructor(public maxAttempts: number = 3) {
    super();
    this.maxAttempts = maxAttempts;
  }

  /**
   * Determines if a request should be retried based on the error.
   *
   * Retries on:
   * - 429 (Too Many Requests)
   * - 500 (Internal Server Error)
   * - 502 (Bad Gateway)
   * - 503 (Service Unavailable)
   * - 504 (Gateway Timeout)
   * - ECONNABORTED (Connection Aborted)
   *
   * @param error - The error encountered.
   * @returns `true` if the error is transient and retryable; otherwise, `false`.
   */
  public retryOn(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const httpError = error as HttpNetworkError;
    const status = httpError?.response?.status;

    return (
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      httpError?.code === 'ECONNABORTED'
    );
  }

  /**
   * Calculates the delay before the next retry attempt using exponential backoff with jitter.
   *
   * Formula: (2^attempt * 100) + random(0-50) ms.
   *
   * @param attempt - The current attempt number.
   * @returns The delay duration in milliseconds.
   */
  public backoffMs(attempt: number): number {
    const base = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return base + jitter;
  }
}
