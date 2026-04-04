import {
  HttpErrorInterceptor,
  HttpRequestInterceptor,
  HttpResponseInterceptor,
  HttpValidatedResponseInterceptor,
} from '../contracts/http-interceptor.contract';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { Request } from '../models/request';
import { Response } from '../models/response';

/** A single recorded invocation of the {@link SpyInterceptor.onError} hook. */
export interface SpyInterceptorErrorCall {
  /** The error that was intercepted. */
  error: BaseAdapterException;
  /** The request during which the error occurred. */
  request: Request;
}

/**
 * A spy implementation of all HTTP interceptor hooks.
 *
 * Each hook records its invocation arguments and passes the value through
 * unchanged. Use the `*Calls` arrays in assertions and call `reset()` between
 * tests to start with a clean slate.
 *
 * @example
 * ```typescript
 * const spy = new SpyInterceptor();
 *
 * HttpAdapter.builder()
 *   .withInterceptor(spy)
 *   .build();
 *
 * // after making a request:
 * expect(spy.requestCalls).toHaveLength(1);
 * expect(spy.requestCalls[0].endpoint).toBe('/api/pay');
 * ```
 */
export class SpyInterceptor
  implements
    HttpRequestInterceptor,
    HttpResponseInterceptor,
    HttpValidatedResponseInterceptor,
    HttpErrorInterceptor
{
  /** All requests recorded by {@link onRequest}, in call order. */
  readonly requestCalls: Request[] = [];

  /** All responses recorded by {@link onResponse}, in call order. */
  readonly responseCalls: Response[] = [];

  /** All responses recorded by {@link onResponseValidated}, in call order. */
  readonly responseValidatedCalls: Response[] = [];

  /** All invocations of {@link onError}, in call order. */
  readonly errorCalls: SpyInterceptorErrorCall[] = [];

  /**
   * Records the request and returns it unchanged.
   *
   * @param request - The outgoing request.
   * @returns A promise that resolves to the original request.
   */
  onRequest(request: Request): Promise<Request> {
    this.requestCalls.push(request);
    return Promise.resolve(request);
  }

  /**
   * Records the response and returns it unchanged.
   *
   * @param response - The incoming response.
   * @returns A promise that resolves to the original response.
   */
  onResponse(response: Response): Promise<Response> {
    this.responseCalls.push(response);
    return Promise.resolve(response);
  }

  /**
   * Records the validated response and returns it unchanged.
   *
   * @param response - The validated response.
   * @returns A promise that resolves to the original response.
   */
  onResponseValidated(response: Response): Promise<Response> {
    this.responseValidatedCalls.push(response);
    return Promise.resolve(response);
  }

  /**
   * Records the error and returns it unchanged.
   *
   * @param error - The error that occurred.
   * @param request - The request during which the error occurred.
   * @returns A promise that resolves to the original error.
   */
  onError(error: BaseAdapterException, request: Request): Promise<BaseAdapterException> {
    this.errorCalls.push({ error, request });
    return Promise.resolve(error);
  }

  /**
   * Clears all recorded calls from every hook.
   *
   * Call this in `beforeEach` or `afterEach` to avoid cross-test contamination.
   */
  reset(): void {
    this.requestCalls.length = 0;
    this.responseCalls.length = 0;
    this.responseValidatedCalls.length = 0;
    this.errorCalls.length = 0;
  }
}
