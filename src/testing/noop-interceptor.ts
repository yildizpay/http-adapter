import {
  HttpErrorInterceptor,
  HttpRequestInterceptor,
  HttpResponseInterceptor,
  HttpValidatedResponseInterceptor,
} from '../contracts/http-interceptor.contract';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { Request } from '../models/request';
import { Response } from '../models/response';

/**
 * A no-op implementation of all HTTP interceptor hooks.
 *
 * Each hook returns the received value unchanged. Useful as a base class when
 * only a subset of hooks needs to be overridden, or as a safe stand-in for
 * tests that require an interceptor but do not care about its behaviour.
 *
 * @example
 * ```typescript
 * HttpAdapter.builder()
 *   .withInterceptor(new NoopInterceptor())
 *   .build();
 * ```
 */
export class NoopInterceptor
  implements
    HttpRequestInterceptor,
    HttpResponseInterceptor,
    HttpValidatedResponseInterceptor,
    HttpErrorInterceptor
{
  /**
   * Returns the request unchanged.
   *
   * @param request - The outgoing request.
   * @returns A promise that resolves to the original request.
   */
  onRequest(request: Request): Promise<Request> {
    return Promise.resolve(request);
  }

  /**
   * Returns the response unchanged.
   *
   * @param response - The incoming response.
   * @returns A promise that resolves to the original response.
   */
  onResponse(response: Response): Promise<Response> {
    return Promise.resolve(response);
  }

  /**
   * Returns the validated response unchanged.
   *
   * @param response - The validated response.
   * @returns A promise that resolves to the original response.
   */
  onResponseValidated(response: Response): Promise<Response> {
    return Promise.resolve(response);
  }

  /**
   * Returns the error unchanged.
   *
   * @param error - The error that occurred.
   * @param _request - The request during which the error occurred (unused).
   * @returns A promise that resolves to the original error.
   */
  onError(error: BaseAdapterException, _request: Request): Promise<BaseAdapterException> {
    return Promise.resolve(error);
  }
}
