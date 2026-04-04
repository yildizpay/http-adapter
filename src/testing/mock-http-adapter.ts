import { Request } from '../models/request';
import { Response } from '../models/response';
import { HttpAdapterContract } from '../contracts/http-adapter.contract';

type ResolvedItem<T> = { type: 'resolve'; data: T };
type RejectedItem = { type: 'reject'; error: unknown };
type QueueItem<T = unknown> = ResolvedItem<T> | RejectedItem;

type EndpointHandler = {
  queue: QueueItem[];
  defaultBehavior: QueueItem | null;
};

/**
 * A scoped mock builder returned by {@link MockHttpAdapter.onEndpoint}.
 *
 * Configures resolved or rejected responses for a specific endpoint path.
 * All methods return `this` for chaining.
 *
 * @example
 * ```typescript
 * mock
 *   .onEndpoint('/api/services/ProcessQuery')
 *   .mockResolvedValue({ STATUS: 'SUCCESS' });
 *
 * mock
 *   .onEndpoint('/api/services/GetPaymentList')
 *   .mockResolvedValue({ paymentList: [] });
 * ```
 */
export class EndpointMockScope {
  private readonly handler: EndpointHandler;

  /** @internal */
  constructor(endpoint: string, handlers: Map<string, EndpointHandler>) {
    if (!handlers.has(endpoint)) {
      handlers.set(endpoint, { queue: [], defaultBehavior: null });
    }
    this.handler = handlers.get(endpoint)!;
  }

  /**
   * Sets the default resolved response for this endpoint once the one-time queue is exhausted.
   */
  mockResolvedValue<T>(data: T): this {
    this.handler.defaultBehavior = { type: 'resolve', data };
    return this;
  }

  /**
   * Sets the default error thrown for this endpoint once the one-time queue is exhausted.
   */
  mockRejectedValue(error: unknown): this {
    this.handler.defaultBehavior = { type: 'reject', error };
    return this;
  }

  /**
   * Enqueues a one-time resolved response for this endpoint. Consumed in FIFO order.
   */
  mockResolvedOnce<T>(data: T): this {
    this.handler.queue.push({ type: 'resolve', data });
    return this;
  }

  /**
   * Enqueues a one-time rejection for this endpoint. Consumed in FIFO order.
   */
  mockRejectedOnce(error: unknown): this {
    this.handler.queue.push({ type: 'reject', error });
    return this;
  }
}

/**
 * A configurable test double for {@link import('../core/http.adapter').HttpAdapter}.
 *
 * Use this when testing service or application code that depends on `HttpAdapter.send()`.
 * It bypasses the full adapter pipeline (interceptors, retry, circuit breaker) and
 * returns pre-configured responses directly.
 *
 * Supports two levels of response configuration:
 * - **Global**: applies to all requests not matched by an endpoint-specific handler.
 * - **Endpoint-specific**: scoped to a particular endpoint path via `onEndpoint()`.
 *
 * Resolution order per request:
 * 1. Endpoint-specific one-time queue (FIFO)
 * 2. Endpoint-specific default
 * 3. Global one-time queue (FIFO)
 * 4. Global default
 *
 * @example
 * ```typescript
 * // Global mock
 * const adapter = new MockHttpAdapter()
 *   .mockResolvedValue<PaymentResponse>({ transactionId: 'tx_1', status: 'approved' });
 *
 * // Endpoint-specific mock
 * const adapter = new MockHttpAdapter();
 * adapter.onEndpoint('/api/ProcessQuery').mockResolvedValue({ STATUS: 'SUCCESS' });
 * adapter.onEndpoint('/api/GetPaymentList').mockResolvedValue({ paymentList: [] });
 * ```
 */
export class MockHttpAdapter implements HttpAdapterContract {
  private readonly calls: Request[] = [];
  private readonly queue: QueueItem[] = [];
  private defaultBehavior: QueueItem | null = null;
  private readonly endpointHandlers: Map<string, EndpointHandler> = new Map();

  /**
   * Returns a scoped builder for configuring responses for a specific endpoint path.
   *
   * Endpoint-specific responses take priority over the global queue and default.
   * If the endpoint scope is exhausted, the global configuration is used as fallback.
   */
  onEndpoint(endpoint: string): EndpointMockScope {
    return new EndpointMockScope(endpoint, this.endpointHandlers);
  }

  /**
   * Sets the default resolved response returned for every call once the one-time
   * queue is exhausted. The data is wrapped in a {@link Response} with status 200.
   */
  mockResolvedValue<T>(data: T): this {
    this.defaultBehavior = { type: 'resolve', data };
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
  mockResolvedOnce<T>(data: T): this {
    this.queue.push({ type: 'resolve', data });
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
   * Simulates `HttpAdapter.send()`. Records the request and returns the next
   * configured response, resolving in this order:
   * 1. Endpoint-specific one-time queue
   * 2. Endpoint-specific default
   * 3. Global one-time queue
   * 4. Global default
   *
   * @throws {Error} If no response is configured and the queue is empty.
   */
  async send<T = unknown>(request: Request): Promise<Response<T>> {
    this.calls.push(request);

    let item: QueueItem | null | undefined;

    const endpointHandler = this.endpointHandlers.get(request.endpoint);
    if (endpointHandler) {
      item = endpointHandler.queue.shift() ?? endpointHandler.defaultBehavior;
    }

    item ??= this.queue.shift() ?? this.defaultBehavior;

    if (!item) {
      throw new Error(
        'MockHttpAdapter: No response configured. ' +
          'Call mockResolvedValue(), mockRejectedValue(), or onEndpoint() before sending a request.',
      );
    }

    if (item.type === 'reject') throw item.error;

    return Response.create<T>(item.data as T, 200, null);
  }

  /**
   * Returns a snapshot of all recorded requests in call order.
   */
  getCalls(): Request[] {
    return [...this.calls];
  }

  /**
   * Returns the request at the given zero-based index.
   *
   * @throws {Error} If no call exists at that index.
   */
  getCall(index: number): Request {
    const call = this.calls[index];
    if (!call) {
      throw new Error(
        `MockHttpAdapter: No call at index ${index}. Total calls: ${this.calls.length}.`,
      );
    }
    return call;
  }

  /**
   * Asserts that `send()` was called exactly `n` times.
   *
   * @throws {Error} If the actual call count does not match.
   */
  assertCalledTimes(n: number): void {
    if (this.calls.length !== n) {
      throw new Error(`MockHttpAdapter: Expected ${n} call(s), but got ${this.calls.length}.`);
    }
  }

  /**
   * Asserts that at least one call was made to the given endpoint and method.
   *
   * @throws {Error} If no call matches.
   */
  assertCalledWith(request: Request): void {
    const matched = this.calls.some(
      (call) => call.endpoint === request.endpoint && call.method === request.method,
    );

    if (!matched) {
      throw new Error(
        `MockHttpAdapter: No call matched ${request.method} ${request.endpoint}.\n` +
          `Actual calls:\n${this.calls.map((c) => [c.method, c.endpoint].join(' ')).join('\n')}`,
      );
    }
  }

  /**
   * Asserts that `send()` was never called.
   *
   * @throws {Error} If any calls were recorded.
   */
  assertNotCalled(): void {
    if (this.calls.length > 0) {
      throw new Error(`MockHttpAdapter: Expected no calls, but got ${this.calls.length}.`);
    }
  }

  /**
   * Clears all recorded calls, the one-time queue, endpoint-specific handlers,
   * and the default behavior.
   */
  reset(): void {
    this.calls.length = 0;
    this.queue.length = 0;
    this.defaultBehavior = null;
    this.endpointHandlers.clear();
  }
}
