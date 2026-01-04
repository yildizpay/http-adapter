import { Request } from "../models/request";
import { Response } from "../models/response";

/**
 * Defines the contract for an HTTP interceptor.
 *
 * Interceptors are used to inspect, modify, or handle HTTP requests and responses
 * globally or for specific clients. They can be used for tasks such as adding authentication tokens,
 * logging, error handling, or transforming data.
 */
export interface HttpInterceptor {
  /**
   * Intercepts an outgoing HTTP request before it is sent to the server.
   *
   * Use this method to modify request headers, body, or other properties.
   *
   * @param request - The outgoing request object.
   * @returns A promise that resolves to the modified (or original) request object.
   */
  onRequest(request: Request): Promise<Request>;

  /**
   * Intercepts an incoming HTTP response before it is processed by the caller.
   *
   * Use this method to inspect or transform the response data.
   *
   * @param response - The incoming response object.
   * @returns A promise that resolves to the modified (or original) response object.
   */
  onResponse(response: Response): Promise<Response>;

  /**
   * Intercepts errors that occur during the HTTP request lifecycle.
   *
   * Use this method to handle network errors, timeouts, or non-success HTTP status codes
   * centrally. You can also re-throw a custom error or return a fallback value.
   *
   * @param error - The error that occurred.
   * @param request - The request during which the error occurred.
   * @returns A promise that resolves to a handled error or alternative result.
   */
  onError(error: unknown, request: Request): Promise<unknown>;
}
