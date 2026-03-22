import { HttpMethod } from '../common/enums/http-method.enum';
import { HttpBody } from '../common/types/http.types';

export interface HttpClientRequestConfig {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  data?: HttpBody | null;
  timeout?: number;
}

export interface HttpClientResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Defines the contract for an HTTP client adapter to interact with an underlying transport layer.
 */
export interface HttpClientContract {
  /**
   * Executes an HTTP request.
   *
   * @param config - The request configuration parameters.
   * @returns A promise that resolves strictly to an `HttpClientResponse`.
   */
  request<T = unknown>(config: HttpClientRequestConfig): Promise<HttpClientResponse<T>>;
}

/**
 * Standardized exception thrown by any HttpClient implementation.
 * Ensures the upper layers (Retry policies, Interceptors) receive a strongly-typed and consistent error shape.
 */
export class HttpClientException<T = unknown> extends Error {
  public readonly response?: {
    status: number;
    data: T;
    headers: Record<string, string>;
  };
  public readonly code?: string;

  constructor(
    message: string,
    status?: number,
    data?: T,
    headers?: Record<string, string>,
    code?: string,
  ) {
    super(message);
    this.name = 'HttpClientException';
    Object.setPrototypeOf(this, HttpClientException.prototype);

    if (status !== undefined) {
      this.response = {
        status,
        data: data as T,
        headers: headers ?? {},
      };
    }
    this.code = code;
  }
}
