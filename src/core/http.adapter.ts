import { defaultHttpClient } from './default-http-client';
import { Request } from '../models/request';
import { Response } from '../models/response';
import { RequestContext } from '../models/request-context';
import { HttpInterceptor } from '../contracts/http-interceptor.contract';
import { RetryPolicy } from '../contracts/retry-policy.contract';
import { RetryExecutor } from '../resilience/retry-executor';
import { CircuitBreaker } from '../resilience/circuit-breaker/circuit-breaker';
import { HttpClientContract } from '../contracts/http-client.contract';
import { ErrorConverter } from './error.converter';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { ValidationException } from '../exceptions/validation.exception';

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
   * @param httpClient - The underlying HTTP client used for network transport.
   * @param retryPolicy - Optional resiliency policy; if absent, no retries are attempted.
   */
  private constructor(
    private readonly interceptors: HttpInterceptor[],
    private readonly httpClient: HttpClientContract,
    private readonly retryPolicy?: RetryPolicy,
    private readonly circuitBreaker?: CircuitBreaker,
  ) {}

  /**
   * Factory method to create a properly configured HttpAdapter.
   *
   * @param interceptors - A list of interceptors to register.
   * @param retryPolicy - An optional retry policy for resilience.
   * @param httpClient - An optional custom HTTP client (defaults to `defaultHttpClient`).
   * @returns A new instance of `HttpAdapter`.
   */
  public static create(
    interceptors: HttpInterceptor[],
    retryPolicy?: RetryPolicy,
    httpClient?: HttpClientContract,
    circuitBreaker?: CircuitBreaker,
  ): HttpAdapter {
    return new HttpAdapter(
      interceptors,
      httpClient ?? defaultHttpClient,
      retryPolicy,
      circuitBreaker,
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
  public async send<T = unknown>(request: Request): Promise<Response<T>> {
    const executePipeline = () => {
      if (!this.retryPolicy) {
        return this.dispatch<T>(request);
      }
      const executor = new RetryExecutor(this.retryPolicy);
      return executor.execute(() => this.dispatch<T>(request));
    };

    if (!this.circuitBreaker) {
      return executePipeline();
    }

    return this.circuitBreaker.execute(executePipeline);
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
  private async dispatch<T = unknown>(request: Request): Promise<Response<T>> {
    let processedRequest: Request = request;

    /* Apply request-side interceptors in registration order */
    for (const interceptor of this.interceptors) {
      if (interceptor.onRequest) {
        processedRequest = await interceptor.onRequest(processedRequest);
      }
    }

    let requestContext: RequestContext | undefined;

    try {
      /* Build final URL with query parameters */
      const url = new URL(processedRequest.endpoint, processedRequest.baseUrl);
      const searchParams = new URLSearchParams(processedRequest.queryParams);
      if (searchParams.toString()) {
        url.search = searchParams.toString();
      }

      requestContext = {
        method: processedRequest.method as string,
        url: url.toString(),
        correlationId: processedRequest.systemCorrelationId,
      };

      processedRequest.setTimestamp(new Date());

      /* Delegate to the underlying HTTP client */
      const clientResponse = await this.httpClient.request<T>({
        url: requestContext.url!,
        method: processedRequest.method,
        data: processedRequest.body,
        headers: processedRequest.headers,
        timeout: processedRequest.options?.timeout,
      });

      /* Construct strongly-typed response object */
      let response = Response.create<T>(
        clientResponse.data,
        clientResponse.status,
        clientResponse.headers ?? null,
        requestContext,
      );

      /* Apply response-side interceptors — runs regardless of validation outcome */
      for (const interceptor of this.interceptors) {
        if (interceptor.onResponse) {
          response = (await interceptor.onResponse(response)) as Response<T>;
        }
      }

      /* Run response validators sequentially — first failure halts the chain.
         Non-BaseAdapterException errors (e.g. ZodError) are wrapped in ValidationException
         so callers always receive a typed, inspectable exception. */
      for (const validator of request.validators) {
        try {
          await validator.validate(response);
        } catch (err) {
          if (err instanceof BaseAdapterException) throw err;
          throw new ValidationException('Response validation failed', response, err);
        }
      }

      /* Apply post-validation interceptors — only reached when all validators pass */
      for (const interceptor of this.interceptors) {
        if (interceptor.onResponseValidated) {
          response = (await interceptor.onResponseValidated(response)) as Response<T>;
        }
      }

      return response;
    } catch (error) {
      let propagatedError = ErrorConverter.toAdapterException(error, requestContext);

      /* Apply error-side interceptors in registration order */
      for (const interceptor of this.interceptors) {
        if (interceptor.onError) {
          propagatedError = await interceptor.onError(propagatedError, processedRequest);
        }
      }

      throw propagatedError;
    }
  }
}
