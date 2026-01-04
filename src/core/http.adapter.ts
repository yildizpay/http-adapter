import { defaultHttpClient } from "./default-http-client";
import { Request } from "../models/request";
import { Response } from "../models/response";
import { HttpInterceptor } from "../contracts/http-interceptor.contract";
import { RetryPolicy } from "../contracts/retry-policy.contract";
import { RetryExecutor } from "../resilience/retry-executor";
import { AxiosInstance } from "axios";

/**
 * The core HTTP adapter that orchestrates outbound requests.
 *
 * This class acts as a flexible and resilient HTTP client wrapper. It supports:
 * - **Interceptors**: A chain of middleware to modify requests, responses, and handle errors.
 * - **Retry Policies**: Configurable strategies for handling transient failures (e.g., exponential backoff).
 * - **Strong Typing**: Generic support for typed response payloads.
 *
 * It is designed to be immutable in its configuration but can handle concurrent requests.
 */
export class HttpAdapter {
  /**
   * Initializes a new instance of the HttpAdapter class.
   *
   * @param interceptors - Ordered list of interceptors to apply on every request/response/error.
   * @param httpClient - The underlying Axios instance used for network transport.
   * @param retryPolicy - Optional resiliency policy; if absent, no retries are attempted.
   */
  private constructor(
    private readonly interceptors: HttpInterceptor[],
    private readonly httpClient: AxiosInstance,
    private readonly retryPolicy?: RetryPolicy
  ) {}

  /**
   * Factory method to create a properly configured HttpAdapter.
   *
   * @param interceptors - A list of interceptors to register.
   * @param retryPolicy - An optional retry policy for resilience.
   * @param httpClient - An optional custom Axios instance (defaults to `defaultHttpClient`).
   * @returns A new instance of `HttpAdapter`.
   */
  public static create(
    interceptors: HttpInterceptor[],
    retryPolicy?: RetryPolicy,
    httpClient?: AxiosInstance
  ): HttpAdapter {
    return new HttpAdapter(
      interceptors,
      httpClient ?? defaultHttpClient,
      retryPolicy
    );
  }

  /**
   * Sends a single HTTP request, applying all registered interceptors and retry policies.
   *
   * @template T - The expected shape of the response payload.
   * @param request - The fully-populated request object.
   * @returns A promise that resolves to a `Response<T>` containing the data and metadata.
   * @throws The last error encountered if all retries fail, or if an interceptor throws.
   */
  public async send<T = any>(request: Request): Promise<Response<T>> {
    if (!this.retryPolicy) {
      return this.dispatch<T>(request);
    }

    const executor = new RetryExecutor(this.retryPolicy);
    return executor.execute(() => this.dispatch<T>(request));
  }

  /**
   * Executes the actual HTTP call after the request-side interceptor chain has finished.
   * Handles response creation and flows through the response-side or error-side interceptors.
   *
   * @private
   * @template T - The expected shape of the response payload.
   * @param request - The request object (possibly mutated by interceptors).
   * @returns A promise that resolves to the final `Response<T>`.
   */
  private async dispatch<T = any>(request: Request): Promise<Response<T>> {
    let processedRequest: Request = request;

    /* Apply request-side interceptors in registration order */
    for (const interceptor of this.interceptors) {
      processedRequest = await interceptor.onRequest(processedRequest);
    }

    try {
      /* Build final URL with query parameters */
      const url = new URL(processedRequest.endpoint, processedRequest.baseUrl);
      const searchParams = new URLSearchParams(processedRequest.queryParams);
      if (searchParams.toString()) {
        url.search = searchParams.toString();
      }

      processedRequest.setTimestamp(new Date());

      /* Delegate to the underlying HTTP client */
      const axiosResponse = await this.httpClient.request({
        url: url.toString(),
        method: processedRequest.method,
        data: processedRequest.body,
        headers: processedRequest.headers,
        timeout: processedRequest.options?.timeout,
      });

      /* Construct strongly-typed response object */
      let response = Response.create<T>(
        axiosResponse.data,
        axiosResponse.status,
        (axiosResponse.headers as Record<string, string>) ?? null,
        processedRequest.systemCorrelationId
      );

      /* Apply response-side interceptors in registration order */
      for (const interceptor of this.interceptors) {
        response = await interceptor.onResponse(response);
      }

      return response;
    } catch (error) {
      let propagatedError = error;

      /* Allow interceptors to observe or mutate the error */
      for (const interceptor of this.interceptors) {
        propagatedError = await interceptor.onError(
          propagatedError,
          processedRequest
        );
      }

      throw propagatedError;
    }
  }
}
