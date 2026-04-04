import {
  HttpClientContract,
  HttpClientRequestConfig,
  HttpClientResponse,
} from '../contracts/http-client.contract';

type ResolvedItem = { type: 'resolve'; value: HttpClientResponse<unknown> };
type RejectedItem = { type: 'reject'; error: unknown };
type QueueItem = ResolvedItem | RejectedItem;

/**
 * A configurable test double for {@link HttpClientContract}.
 *
 * Use this when you want to test the adapter's own behaviour (interceptors, retry,
 * circuit breaker) without making real HTTP calls.
 *
 * @example
 * ```typescript
 * const client = new MockHttpClient()
 *   .mockResolvedValue({ data: { id: 1 }, status: 200, headers: {} });
 *
 * const adapter = HttpAdapter.builder()
 *   .withHttpClient(client)
 *   .withRetryPolicy(RetryPolicies.exponential(3))
 *   .build();
 *
 * await adapter.send(request);
 * client.assertCalledTimes(1);
 * ```
 */
export class MockHttpClient implements HttpClientContract {
  private readonly calls: HttpClientRequestConfig[] = [];
  private readonly queue: QueueItem[] = [];
  private defaultBehavior: QueueItem | null = null;

  /**
   * Sets the default resolved response returned for every call once the one-time
   * queue is exhausted.
   */
  mockResolvedValue(value: HttpClientResponse<unknown>): this {
    this.defaultBehavior = { type: 'resolve', value };
    return this;
  }

  /**
   * Sets the default error thrown for every call once the one-time queue is exhausted.
   */
  mockRejectedValue(error: unknown): this {
    this.defaultBehavior = { type: 'reject', error };
    return this;
  }

  /**
   * Enqueues a one-time resolved response. Consumed in FIFO order before the default.
   */
  mockResolvedOnce(value: HttpClientResponse<unknown>): this {
    this.queue.push({ type: 'resolve', value });
    return this;
  }

  /**
   * Enqueues a one-time rejection. Consumed in FIFO order before the default.
   */
  mockRejectedOnce(error: unknown): this {
    this.queue.push({ type: 'reject', error });
    return this;
  }

  /**
   * @inheritdoc
   */
  async request<T>(config: HttpClientRequestConfig): Promise<HttpClientResponse<T>> {
    this.calls.push(config);

    const item = this.queue.shift() ?? this.defaultBehavior;

    if (!item) {
      throw new Error(
        'MockHttpClient: No response configured. ' +
          'Call mockResolvedValue() or mockRejectedValue() before sending a request.',
      );
    }

    if (item.type === 'reject') throw item.error;

    return item.value as HttpClientResponse<T>;
  }

  /**
   * Returns a snapshot of all recorded request configs in call order.
   */
  getCalls(): HttpClientRequestConfig[] {
    return [...this.calls];
  }

  /**
   * Returns the request config at the given zero-based index.
   *
   * @throws {Error} If no call exists at that index.
   */
  getCall(index: number): HttpClientRequestConfig {
    const call = this.calls[index];
    if (!call) {
      throw new Error(
        `MockHttpClient: No call at index ${index}. Total calls: ${this.calls.length}.`,
      );
    }
    return call;
  }

  /**
   * Asserts that the client was called exactly `n` times.
   *
   * @throws {Error} If the actual call count does not match.
   */
  assertCalledTimes(n: number): void {
    if (this.calls.length !== n) {
      throw new Error(`MockHttpClient: Expected ${n} call(s), but got ${this.calls.length}.`);
    }
  }

  /**
   * Asserts that at least one call matches all provided fields.
   *
   * @throws {Error} If no call matches.
   */
  assertCalledWith(expected: Partial<HttpClientRequestConfig>): void {
    const matched = this.calls.some((call) =>
      Object.entries(expected).every(
        ([key, value]) =>
          JSON.stringify(call[key as keyof HttpClientRequestConfig]) === JSON.stringify(value),
      ),
    );

    if (!matched) {
      throw new Error(
        `MockHttpClient: No call matched ${JSON.stringify(expected)}.\n` +
          `Actual calls:\n${JSON.stringify(this.calls, null, 2)}`,
      );
    }
  }

  /**
   * Asserts that the client was never called.
   *
   * @throws {Error} If any calls were recorded.
   */
  assertNotCalled(): void {
    if (this.calls.length > 0) {
      throw new Error(`MockHttpClient: Expected no calls, but got ${this.calls.length}.`);
    }
  }

  /**
   * Clears all recorded calls, the one-time queue, and the default behavior.
   */
  reset(): void {
    this.calls.length = 0;
    this.queue.length = 0;
    this.defaultBehavior = null;
  }
}
