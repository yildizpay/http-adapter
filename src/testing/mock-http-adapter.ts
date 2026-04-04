import { Request } from '../models/request';
import { Response } from '../models/response';
import { HttpAdapterContract } from '../contracts/http-adapter.contract';
import { HttpMethod } from '../common/enums/http-method.enum';
import { HttpBody } from '../common/types/http.types';

// --- Internal types ---

type ResolvedItem<T> = { type: 'resolve'; data: T; status: number };
type RejectedItem = { type: 'reject'; error: Error };
type ImplementationItem = {
  type: 'implementation';
  fn: (request: Request) => unknown;
  status: number;
};
type QueueItem<T = unknown> = ResolvedItem<T> | RejectedItem | ImplementationItem;

type EndpointHandler = {
  calls: Request[];
  queue: QueueItem[];
  defaultBehavior: QueueItem | null;
};

// --- Public types ---

/**
 * Partial matchers for request assertion methods.
 *
 * Only the properties that are provided will be checked; omitted properties are
 * ignored. Body matching uses deep partial equality — only the listed keys must
 * be present and equal. Headers and query params use strict equality per key.
 *
 * @example
 * ```typescript
 * adapter.assertCalledWith('/api/pay', {
 *   method: HttpMethod.POST,
 *   body: { AMOUNT: '100', CURRENCY: 'TRY' },
 * });
 * ```
 */
export interface RequestMatcher {
  /** Asserts that the request used this HTTP method. */
  method?: HttpMethod;
  /**
   * Asserts that the request body contains at least these key/value pairs.
   * Uses deep partial equality; extra keys in the actual body are ignored.
   */
  body?: HttpBody;
  /**
   * Asserts that the request headers contain at least these key/value pairs.
   * Extra headers in the actual request are ignored.
   */
  headers?: Record<string, string>;
  /**
   * Asserts that the request query params contain at least these key/value pairs.
   * Extra params in the actual request are ignored.
   */
  queryParams?: Record<string, string>;
}

/** Options for configuring a {@link MockHttpAdapter} instance. */
export interface MockHttpAdapterOptions {
  /**
   * When `true`, any call to an endpoint that was not registered via `onEndpoint()`
   * will throw immediately, even if a global default is configured.
   *
   * Use this to prevent unexpected HTTP calls from silently passing in tests.
   */
  strict?: boolean;
}

// --- Private helpers ---

/**
 * Performs a deep partial equality check.
 *
 * - Primitives are compared with `Object.is` (correctly handles `NaN`, `-0`, etc.).
 * - `Date` instances are compared by their numeric time value.
 * - Arrays and plain objects are never considered equal to each other.
 * - For plain objects, only the keys present in `expected` are checked in `actual`.
 * - `null` vs `undefined` are treated as distinct.
 */
function deepPartialEquals(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (actual === null || expected === null) return false;
  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }
  if (typeof actual !== 'object' || typeof expected !== 'object') return false;
  if (Array.isArray(expected) !== Array.isArray(actual)) return false;

  return Object.entries(expected as Record<string, unknown>).every(([key, value]) =>
    deepPartialEquals((actual as Record<string, unknown>)[key], value),
  );
}

function matchesPartialHttpBody(actual: HttpBody, expected: HttpBody): boolean {
  if (Array.isArray(expected) !== Array.isArray(actual)) return false;
  return Object.entries(expected).every(([key, value]) => deepPartialEquals(actual[key], value));
}

function matchesPartialStringRecord(
  actual: Record<string, string>,
  expected: Record<string, string>,
): boolean {
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function matchesMatchers(call: Request, matchers: RequestMatcher): boolean {
  if (matchers.method !== undefined && call.method !== matchers.method) return false;

  if (matchers.body !== undefined) {
    if (call.body === null) return false;
    if (!matchesPartialHttpBody(call.body, matchers.body)) return false;
  }

  if (matchers.headers !== undefined) {
    if (!matchesPartialStringRecord(call.headers, matchers.headers)) return false;
  }

  if (matchers.queryParams !== undefined) {
    if (!matchesPartialStringRecord(call.queryParams, matchers.queryParams)) return false;
  }

  return true;
}

function matchesRequest(call: Request, endpoint: string, matchers?: RequestMatcher): boolean {
  if (call.endpoint !== endpoint) return false;
  if (matchers === undefined) return true;
  return matchesMatchers(call, matchers);
}

function formatCallList(calls: Request[]): string {
  if (calls.length === 0) return '  (no calls)';
  return calls.map((c) => `  ${c.method} ${c.endpoint}`).join('\n');
}

function formatEndpointList(endpoints: string[]): string {
  return endpoints.map((e) => `"${e}"`).join(' → ');
}

// --- EndpointMockScope ---

/**
 * A scoped mock builder returned by {@link MockHttpAdapter.onEndpoint}.
 *
 * Configures responses for a specific endpoint path and provides independent
 * call inspection and assertion capabilities scoped to that endpoint.
 *
 * Endpoint responses take priority over global responses. When the scope is
 * exhausted (queue empty, no default), the global configuration is used as
 * fallback.
 *
 * @example
 * ```typescript
 * const scope = adapter.onEndpoint('/api/services/ProcessQuery');
 * scope.mockResolvedValue({ STATUS: 'SUCCESS' });
 *
 * // After test:
 * scope.assertCalledTimes(1);
 * scope.assertCalledWith({ body: { MERCHANT_ID: 'M001' } });
 * ```
 */
export class EndpointMockScope {
  private readonly endpointPath: string;
  private readonly handler: EndpointHandler;

  /** @internal */
  constructor(endpoint: string, handlers: Map<string, EndpointHandler>) {
    this.endpointPath = endpoint;
    if (!handlers.has(endpoint)) {
      handlers.set(endpoint, { calls: [], queue: [], defaultBehavior: null });
    }
    this.handler = handlers.get(endpoint)!;
  }

  // --- Mock setup ---

  /**
   * Sets the default resolved response for this endpoint once the one-time
   * queue is exhausted. The data is wrapped in a {@link Response} with the
   * given status code.
   *
   * @param data - The response payload.
   * @param status - The HTTP status code (default: `200`).
   */
  mockResolvedValue<T>(data: T, status = 200): this {
    this.handler.defaultBehavior = { type: 'resolve', data, status };
    return this;
  }

  /**
   * Sets the default error thrown for this endpoint once the one-time queue
   * is exhausted.
   *
   * @param error - The error to throw.
   */
  mockRejectedValue(error: Error): this {
    this.handler.defaultBehavior = { type: 'reject', error };
    return this;
  }

  /**
   * Sets a dynamic default implementation for this endpoint. The function
   * receives the incoming {@link Request} and returns the response payload.
   * Consumed after the one-time queue is exhausted.
   *
   * @param fn - A function that receives the request and returns the response data.
   * @param status - The HTTP status code to use for the response (default: `200`).
   */
  mockImplementation<T>(fn: (request: Request) => T | Promise<T>, status = 200): this {
    this.handler.defaultBehavior = {
      type: 'implementation',
      fn: fn as (request: Request) => unknown,
      status,
    };
    return this;
  }

  /**
   * Enqueues a one-time resolved response for this endpoint. Consumed in
   * FIFO order before the default.
   *
   * @param data - The response payload.
   * @param status - The HTTP status code (default: `200`).
   */
  mockResolvedOnce<T>(data: T, status = 200): this {
    this.handler.queue.push({ type: 'resolve', data, status });
    return this;
  }

  /**
   * Enqueues a one-time rejection for this endpoint. Consumed in FIFO order
   * before the default.
   *
   * @param error - The error to throw.
   */
  mockRejectedOnce(error: Error): this {
    this.handler.queue.push({ type: 'reject', error });
    return this;
  }

  /**
   * Enqueues a one-time dynamic implementation for this endpoint. Consumed in
   * FIFO order before the default.
   *
   * @param fn - A function that receives the request and returns the response data.
   * @param status - The HTTP status code to use for the response (default: `200`).
   */
  mockImplementationOnce<T>(fn: (request: Request) => T | Promise<T>, status = 200): this {
    this.handler.queue.push({
      type: 'implementation',
      fn: fn as (request: Request) => unknown,
      status,
    });
    return this;
  }

  // --- Call inspection ---

  /**
   * Returns a snapshot of all requests recorded for this endpoint in call order.
   *
   * @returns A new array containing the recorded requests; mutations do not affect internal state.
   */
  getCalls(): Request[] {
    return [...this.handler.calls];
  }

  /**
   * Returns the request at the given zero-based index for this endpoint.
   *
   * @param index - Zero-based index of the call to retrieve.
   * @returns The request recorded at the given index.
   * @throws {Error} If no call exists at that index.
   */
  getCall(index: number): Request {
    const call = this.handler.calls[index];
    if (!call) {
      throw new Error(
        `MockHttpAdapter: No call at index ${index} for endpoint "${this.endpointPath}". Total calls: ${this.handler.calls.length}.`,
      );
    }
    return call;
  }

  /** Total number of requests recorded for this endpoint. */
  get callCount(): number {
    return this.handler.calls.length;
  }

  /** The first request recorded for this endpoint, or `undefined` if none. */
  get firstCall(): Request | undefined {
    return this.handler.calls[0];
  }

  /** The most recent request recorded for this endpoint, or `undefined` if none. */
  get lastCall(): Request | undefined {
    return this.handler.calls.at(-1);
  }

  /**
   * @returns `true` if at least one request was recorded for this endpoint.
   */
  wasCalled(): boolean {
    return this.handler.calls.length > 0;
  }

  /**
   * @returns `true` if no requests were recorded for this endpoint.
   */
  wasNotCalled(): boolean {
    return this.handler.calls.length === 0;
  }

  // --- Assertions ---

  /**
   * Asserts that this endpoint was called exactly `n` times.
   *
   * @param n - The expected number of invocations.
   * @throws {Error} If the actual call count does not match `n`.
   */
  assertCalledTimes(n: number): void {
    if (this.handler.calls.length !== n) {
      throw new Error(
        `MockHttpAdapter: Expected "${this.endpointPath}" to be called ${n} time(s), but got ${this.handler.calls.length}.`,
      );
    }
  }

  /**
   * Asserts that at least one call to this endpoint matches the given matchers.
   * If no matchers are provided, asserts that the endpoint was called at least once.
   *
   * @param matchers - Optional partial matchers to check request properties.
   * @throws {Error} If no call matches.
   */
  assertCalledWith(matchers?: RequestMatcher): void {
    const matched = this.handler.calls.some(
      (call) => matchers === undefined || matchesMatchers(call, matchers),
    );

    if (!matched) {
      throw new Error(
        `MockHttpAdapter: No call to "${this.endpointPath}" matched the given matchers.` +
          (matchers === undefined ? '' : `\nMatchers: ${JSON.stringify(matchers)}`) +
          `\nActual calls:\n${formatCallList(this.handler.calls)}`,
      );
    }
  }

  /**
   * Asserts that this endpoint was never called.
   *
   * @throws {Error} If any calls were recorded.
   */
  assertNotCalled(): void {
    if (this.handler.calls.length > 0) {
      throw new Error(
        `MockHttpAdapter: Expected "${this.endpointPath}" to not be called, but got ${this.handler.calls.length} call(s).`,
      );
    }
  }

  // --- Reset ---

  /**
   * Clears all recorded calls, the one-time queue, and the default behavior
   * for this endpoint only. Other endpoints and the global configuration are
   * not affected.
   *
   * Existing scope instances remain valid after this call — they continue to
   * reference the same handler.
   */
  reset(): void {
    this.handler.calls = [];
    this.handler.queue = [];
    this.handler.defaultBehavior = null;
  }
}

// --- MockHttpAdapter ---

/**
 * A configurable test double for {@link HttpAdapter}.
 * Implements {@link HttpAdapterContract}.
 *
 * Use this when testing service or application code that depends on
 * `HttpAdapter.send()`. It bypasses the full adapter pipeline (interceptors,
 * retry, circuit breaker) and returns pre-configured responses directly.
 *
 * Supports two levels of response configuration:
 * - **Global**: applies to all requests not matched by an endpoint-specific handler.
 * - **Endpoint-specific**: scoped to a particular endpoint path via `onEndpoint()`.
 *
 * Resolution order per request:
 * 1. Endpoint-specific one-time queue (FIFO)
 * 2. Endpoint-specific default / implementation
 * 3. Global one-time queue (FIFO)
 * 4. Global default / implementation
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
 *
 * // Dynamic response based on request content
 * adapter.mockImplementation((req) =>
 *   req.body?.AMOUNT > 1000 ? { STATUS: 'DECLINED' } : { STATUS: 'SUCCESS' },
 * );
 *
 * // Strict mode — only registered endpoints are allowed
 * const strict = new MockHttpAdapter({ strict: true });
 * strict.onEndpoint('/api/pay').mockResolvedValue({ ok: true });
 * ```
 */
export class MockHttpAdapter implements HttpAdapterContract {
  private readonly strict: boolean;
  private calls: Request[] = [];
  private queue: QueueItem[] = [];
  private defaultBehavior: QueueItem | null = null;
  private readonly endpointHandlers: Map<string, EndpointHandler> = new Map();

  /**
   * @param options - Optional configuration for the adapter.
   */
  constructor(options: MockHttpAdapterOptions = {}) {
    this.strict = options.strict ?? false;
  }

  /**
   * Returns a scoped builder for configuring responses and inspecting calls
   * for a specific endpoint path.
   *
   * Endpoint-specific responses take priority over the global queue and
   * default. If the endpoint scope is exhausted, the global configuration
   * is used as fallback.
   *
   * Scope instances are stable across calls to `onEndpoint()` with the same
   * path — they share the same underlying handler. Calling `adapter.reset()`
   * resets the handler in-place, so existing scope instances remain valid.
   *
   * @param endpoint - The endpoint path to scope (e.g. `'/api/pay'`).
   */
  onEndpoint(endpoint: string): EndpointMockScope {
    return new EndpointMockScope(endpoint, this.endpointHandlers);
  }

  // --- Mock setup ---

  /**
   * Sets the default resolved response returned for every call once the
   * one-time queue is exhausted. The data is wrapped in a {@link Response}
   * with the given status code.
   *
   * @param data - The response payload.
   * @param status - The HTTP status code (default: `200`).
   */
  mockResolvedValue<T>(data: T, status = 200): this {
    this.defaultBehavior = { type: 'resolve', data, status };
    return this;
  }

  /**
   * Sets the default error thrown for every call once the one-time queue
   * is exhausted.
   *
   * @param error - The error to throw.
   */
  mockRejectedValue(error: Error): this {
    this.defaultBehavior = { type: 'reject', error };
    return this;
  }

  /**
   * Sets a dynamic default implementation. The function receives the incoming
   * {@link Request} and returns the response payload. Consumed after the
   * one-time queue is exhausted.
   *
   * @param fn - A function that receives the request and returns the response data.
   * @param status - The HTTP status code to use for the response (default: `200`).
   */
  mockImplementation<T>(fn: (request: Request) => T | Promise<T>, status = 200): this {
    this.defaultBehavior = {
      type: 'implementation',
      fn: fn as (request: Request) => unknown,
      status,
    };
    return this;
  }

  /**
   * Enqueues a one-time resolved response. Consumed in FIFO order before
   * the default.
   *
   * @param data - The response payload.
   * @param status - The HTTP status code (default: `200`).
   */
  mockResolvedOnce<T>(data: T, status = 200): this {
    this.queue.push({ type: 'resolve', data, status });
    return this;
  }

  /**
   * Enqueues a one-time rejection. Consumed in FIFO order before the default.
   *
   * @param error - The error to throw.
   */
  mockRejectedOnce(error: Error): this {
    this.queue.push({ type: 'reject', error });
    return this;
  }

  /**
   * Enqueues a one-time dynamic implementation. Consumed in FIFO order before
   * the default.
   *
   * @param fn - A function that receives the request and returns the response data.
   * @param status - The HTTP status code to use for the response (default: `200`).
   */
  mockImplementationOnce<T>(fn: (request: Request) => T | Promise<T>, status = 200): this {
    this.queue.push({
      type: 'implementation',
      fn: fn as (request: Request) => unknown,
      status,
    });
    return this;
  }

  // --- Send ---

  /**
   * Simulates `HttpAdapter.send()`. Records the request and returns the next
   * configured response, resolving in this order:
   *
   * 1. Endpoint-specific one-time queue
   * 2. Endpoint-specific default / implementation
   * 3. Global one-time queue
   * 4. Global default / implementation
   *
   * @throws {Error} If strict mode is enabled and the endpoint was not registered via `onEndpoint()`.
   * @throws {Error} If no response is configured and the queue is empty.
   */
  async send<T = unknown>(request: Request): Promise<Response<T>> {
    const endpointHandler = this.endpointHandlers.get(request.endpoint);

    if (this.strict && !endpointHandler) {
      throw new Error(
        `MockHttpAdapter: Strict mode is enabled. Unexpected call to "${request.endpoint}". ` +
          `Register the endpoint with onEndpoint("${request.endpoint}") before sending requests.`,
      );
    }

    this.calls.push(request);

    let item: QueueItem | null | undefined;

    if (endpointHandler) {
      endpointHandler.calls.push(request);
      item = endpointHandler.queue.shift() ?? endpointHandler.defaultBehavior;
    }

    item ??= this.queue.shift() ?? this.defaultBehavior;

    if (!item) {
      throw new Error(
        `MockHttpAdapter: No response configured for "${request.endpoint}". ` +
          `Call mockResolvedValue() or onEndpoint("${request.endpoint}").mockResolvedValue() before sending a request.`,
      );
    }

    if (item.type === 'reject') throw item.error;

    if (item.type === 'implementation') {
      // T is a generic type parameter provided by the caller.
      // The cast is intentional and the responsibility of the test author to align types.
      const data = await Promise.resolve(item.fn(request));
      return Response.create<T>(data as T, item.status, {});
    }

    // T is a generic type parameter provided by the caller via mockResolvedValue<T>().
    // The cast is intentional and the responsibility of the test author to align types.
    return Response.create<T>(item.data as T, item.status, {});
  }

  // --- Call inspection ---

  /**
   * Returns a snapshot of all recorded requests in call order.
   *
   * @returns A new array containing the recorded requests; mutations do not affect internal state.
   */
  getCalls(): Request[] {
    return [...this.calls];
  }

  /**
   * Returns the request at the given zero-based index.
   *
   * @param index - Zero-based index of the call to retrieve.
   * @returns The request recorded at the given index.
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

  /** Total number of requests recorded across all endpoints. */
  get callCount(): number {
    return this.calls.length;
  }

  /** The first request recorded, or `undefined` if no calls were made. */
  get firstCall(): Request | undefined {
    return this.calls[0];
  }

  /** The most recent request recorded, or `undefined` if no calls were made. */
  get lastCall(): Request | undefined {
    return this.calls.at(-1);
  }

  /**
   * @returns `true` if at least one request was recorded.
   */
  wasCalled(): boolean {
    return this.calls.length > 0;
  }

  /**
   * @returns `true` if no requests were recorded.
   */
  wasNotCalled(): boolean {
    return this.calls.length === 0;
  }

  // --- Assertions ---

  /**
   * Asserts that `send()` was called exactly `n` times.
   *
   * @param n - The expected number of invocations.
   * @throws {Error} If the actual call count does not match `n`.
   */
  assertCalledTimes(n: number): void {
    if (this.calls.length !== n) {
      throw new Error(`MockHttpAdapter: Expected ${n} call(s), but got ${this.calls.length}.`);
    }
  }

  /**
   * Asserts that at least one call was made to the given endpoint and
   * optionally matches the given request matchers. All provided matchers use
   * partial equality — extra fields in the actual request are ignored.
   *
   * @param endpoint - The endpoint path to match (e.g. `'/api/pay'`).
   * @param matchers - Optional partial matchers to check request properties.
   * @throws {Error} If no call matches.
   */
  assertCalledWith(endpoint: string, matchers?: RequestMatcher): void {
    const matched = this.calls.some((call) => matchesRequest(call, endpoint, matchers));

    if (!matched) {
      throw new Error(
        `MockHttpAdapter: No call matched endpoint "${endpoint}" with the given matchers.` +
          (matchers === undefined ? '' : `\nMatchers: ${JSON.stringify(matchers)}`) +
          `\nActual calls:\n${formatCallList(this.calls)}`,
      );
    }
  }

  /**
   * Asserts that the body of the call at the given zero-based index contains
   * at least the given key/value pairs. Uses deep partial equality for nested
   * values.
   *
   * @param callIndex - Zero-based index of the call to inspect.
   * @param partialBody - The expected key/value pairs to be present in the body.
   * @throws {Error} If the body does not match or the call has no body.
   */
  assertCalledWithBody(callIndex: number, partialBody: HttpBody): void {
    const call = this.getCall(callIndex);

    if (call.body === null) {
      throw new Error(`MockHttpAdapter: Call at index ${callIndex} has no body.`);
    }

    if (!matchesPartialHttpBody(call.body, partialBody)) {
      throw new Error(
        `MockHttpAdapter: Call at index ${callIndex} body did not match.\n` +
          `Expected to contain: ${JSON.stringify(partialBody)}\n` +
          `Actual body: ${JSON.stringify(call.body)}`,
      );
    }
  }

  /**
   * Asserts that the `n`-th call (1-based) was made to the given endpoint
   * and optionally matches the given matchers.
   *
   * @param n - 1-based index of the call to assert.
   * @param endpoint - The expected endpoint path.
   * @param matchers - Optional partial matchers to check request properties.
   * @throws {Error} If the n-th call does not exist or does not match.
   */
  assertNthCalledWith(n: number, endpoint: string, matchers?: RequestMatcher): void {
    const call = this.calls[n - 1];

    if (!call) {
      throw new Error(
        `MockHttpAdapter: Expected call #${n} but only ${this.calls.length} call(s) were made.`,
      );
    }

    if (!matchesRequest(call, endpoint, matchers)) {
      throw new Error(
        `MockHttpAdapter: Call #${n} did not match.\n` +
          `Expected: "${endpoint}"` +
          (matchers === undefined ? '' : ` ${JSON.stringify(matchers)}`) +
          `\nActual: ${call.method} ${call.endpoint}`,
      );
    }
  }

  /**
   * Asserts that the most recent call was made to the given endpoint and
   * optionally matches the given matchers.
   *
   * @param endpoint - The expected endpoint path.
   * @param matchers - Optional partial matchers to check request properties.
   * @throws {Error} If no calls were made or the last call does not match.
   */
  assertLastCalledWith(endpoint: string, matchers?: RequestMatcher): void {
    const call = this.calls.at(-1);

    if (!call) {
      throw new Error('MockHttpAdapter: No calls were made.');
    }

    if (!matchesRequest(call, endpoint, matchers)) {
      throw new Error(
        `MockHttpAdapter: Last call did not match.\n` +
          `Expected: "${endpoint}"` +
          (matchers === undefined ? '' : ` ${JSON.stringify(matchers)}`) +
          `\nActual: ${call.method} ${call.endpoint}`,
      );
    }
  }

  /**
   * Asserts that calls to the given endpoints occurred in the specified
   * relative order.
   *
   * The check uses subsequence matching — other calls may be interleaved
   * between the expected endpoints. Useful for validating multi-step flows.
   *
   * @param endpoints - Ordered list of endpoint paths that must appear as a
   *   subsequence in the actual calls.
   *
   * @example
   * ```typescript
   * adapter.assertCallOrder(['/api/auth', '/api/services/EYV3DPay']);
   * ```
   *
   * @throws {Error} If any endpoint in the list was not called in the expected order.
   */
  assertCallOrder(endpoints: string[]): void {
    const actualEndpoints = this.calls.map((c) => c.endpoint);
    let searchFrom = 0;

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      const idx = actualEndpoints.indexOf(endpoint, searchFrom);

      if (idx === -1) {
        const prevEndpoint = i > 0 ? endpoints[i - 1] : undefined;
        const after =
          prevEndpoint === undefined ? ' as the first call' : ` after "${prevEndpoint}"`;
        const actualOrder =
          actualEndpoints.length > 0 ? formatEndpointList(actualEndpoints) : '(no calls)';

        throw new Error(
          `MockHttpAdapter: Expected "${endpoint}" to be called${after}, but it was not found in the remaining calls.\n` +
            `Expected order: ${formatEndpointList(endpoints)}\n` +
            `Actual call order: ${actualOrder}`,
        );
      }

      searchFrom = idx + 1;
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

  // --- Reset ---

  /**
   * Clears all recorded calls, the one-time queue, and the default behavior.
   * Endpoint-specific handlers are reset in-place, so existing
   * {@link EndpointMockScope} instances remain valid after this call.
   */
  reset(): void {
    this.calls = [];
    this.queue = [];
    this.defaultBehavior = null;
    for (const handler of this.endpointHandlers.values()) {
      handler.calls = [];
      handler.queue = [];
      handler.defaultBehavior = null;
    }
  }
}
