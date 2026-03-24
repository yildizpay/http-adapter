import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { UnknownException } from '../exceptions/unknown.exception';
import { HttpExceptionFactory } from '../exceptions/http-exception.factory';
import { NetworkExceptionFactory } from '../exceptions/network-exception.factory';
import { RequestContext } from '../models/request-context';

/**
 * Shape of an HTTP-like error object (e.g. Axios error, custom client error).
 */
interface HttpLikeError {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
  code?: string;
  message?: string;
  name?: string;
  response?: {
    status?: number;
    data?: unknown;
    headers?: Record<string, string>;
  };
}

/**
 * Universal error converter responsible for normalizing any error received from
 * an HttpClient implementation into a standardized BaseAdapterException hierarchy.
 */
export class ErrorConverter {
  /**
   * Coerces any unknown error into a strongly-typed BaseAdapterException.
   *
   * @param error - The raw error to convert.
   * @param requestContext - Safe metadata about the originating request.
   * @returns A standardized exception (HttpException, NetworkException, or UnknownException).
   */
  public static toAdapterException(
    error: unknown,
    requestContext?: RequestContext,
  ): BaseAdapterException {
    if (error instanceof BaseAdapterException) return error;

    if (error && typeof error === 'object') {
      const errObj = error as HttpLikeError;

      const status = errObj.status ?? errObj.response?.status;
      if (typeof status === 'number') {
        const data = errObj.data ?? errObj.response?.data;
        const headers = errObj.headers ?? errObj.response?.headers;
        const message = errObj.message ?? `Request failed with status ${status}`;

        return HttpExceptionFactory.createFromResponse(
          status,
          data,
          headers,
          message,
          errObj.code,
          error,
          requestContext,
        );
      }

      if (errObj.code || errObj.name === 'AbortError') {
        return NetworkExceptionFactory.createFromNativeError(error, requestContext);
      }

      if (error instanceof Error) return new UnknownException(error.message, error, requestContext);
    }

    return new UnknownException(
      typeof error === 'string' ? error : 'Unknown Adapter Error',
      error,
      requestContext,
    );
  }
}
