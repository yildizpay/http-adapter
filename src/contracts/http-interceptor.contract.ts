import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { Request } from '../models/request';
import { Response } from '../models/response';

/**
 * Defines the contract for an HTTP interceptor.
 *
 * Interceptors are used to inspect, modify, or handle HTTP requests and responses
 * globally or for specific clients. They can be used for tasks such as adding authentication tokens,
 * logging, error handling, or transforming data.
 */
export interface HttpRequestInterceptor {
  /**
   * Intercepts an outgoing HTTP request before it is sent to the server.
   *
   * Use this method to modify request headers, body, or other properties.
   *
   * @param request - The outgoing request object.
   * @returns A promise that resolves to the modified (or original) request object.
   */
  onRequest(request: Request): Promise<Request>;
}

export interface HttpResponseInterceptor {
  /**
   * Intercepts an incoming HTTP response before it is processed by the caller.
   *
   * Use this method to inspect or transform the response data.
   *
   * @param response - The incoming response object.
   * @returns A promise that resolves to the modified (or original) response object.
   */
  onResponse(response: Response): Promise<Response>;
}

export interface HttpValidatedResponseInterceptor {
  /**
   * Intercepts an HTTP response after all registered validators have passed.
   *
   * Use this method for operations that require a business-valid response, such as
   * caching, data transformation, or triggering downstream side effects.
   * This hook is NOT called if any validator throws a `ValidationException`.
   *
   * @param response - The validated response object.
   * @returns A promise that resolves to the modified (or original) response object.
   */
  onResponseValidated(response: Response): Promise<Response>;
}

export interface HttpErrorInterceptor {
  /**
   * Intercepts errors that occur during the HTTP request lifecycle.
   *
   * Triggered by network failures, HTTP error status codes, and `ValidationException`s.
   * Use this method to handle errors centrally, re-throw a custom error, or return a fallback.
   *
   * @param error - The error that occurred.
   * @param request - The request during which the error occurred.
   * @returns A promise that resolves to a handled error or alternative result.
   */
  onError(error: BaseAdapterException, request: Request): Promise<BaseAdapterException>;
}

export type HttpInterceptor = Partial<HttpRequestInterceptor> &
  Partial<HttpResponseInterceptor> &
  Partial<HttpValidatedResponseInterceptor> &
  Partial<HttpErrorInterceptor>;
