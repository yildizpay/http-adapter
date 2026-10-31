import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { HttpExceptionFactory } from '../exceptions/http-exception.factory';
import { HttpException } from '../exceptions/http-status.exceptions';
import { NetworkException } from '../exceptions/network.exceptions';
import { NetworkExceptionFactory } from '../exceptions/network-exception.factory';
import { UnknownException } from '../exceptions/unknown.exception';
import type { RequestContext } from '../models/request-context';

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
   * @param requestContext - Safe metadata about the originating request. It is also attached
   *   to an incoming `BaseAdapterException` that has no context yet (e.g. one thrown by
   *   `FetchHttpClient`, which does not know the request metadata); existing context is kept.
   * @returns A standardized exception (HttpException, NetworkException, or UnknownException).
   */
  public static toAdapterException(
    error: unknown,
    requestContext?: RequestContext,
  ): BaseAdapterException {
    if (error instanceof BaseAdapterException) {
      return ErrorConverter.attachRequestContext(error, requestContext);
    }

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

      if (
        NetworkExceptionFactory.resolveCode(error) ||
        errObj.name === 'AbortError' ||
        errObj.name === 'TimeoutError'
      ) {
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

  /**
   * Attaches `requestContext` to an exception that does not carry one yet.
   *
   * @private
   */
  private static attachRequestContext(
    error: BaseAdapterException,
    requestContext?: RequestContext,
  ): BaseAdapterException {
    if (!requestContext) return error;

    if (error instanceof HttpException) {
      const response = error.response as { requestContext?: RequestContext };
      response.requestContext ??= requestContext;
    } else if (error instanceof NetworkException || error instanceof UnknownException) {
      const target = error as { requestContext?: RequestContext };
      target.requestContext ??= requestContext;
    }
    return error;
  }
}
