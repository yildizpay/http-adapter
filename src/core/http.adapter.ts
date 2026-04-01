import { defaultHttpClient } from './default-http-client';
import { Request } from '../models/request';
import { Response } from '../models/response';
import { RequestContext } from '../models/request-context';
import {
  HttpInterceptor,
  HttpRequestInterceptor,
  HttpResponseInterceptor,
  HttpValidatedResponseInterceptor,
  HttpErrorInterceptor,
} from '../contracts/http-interceptor.contract';
import { RetryPolicy } from '../contracts/retry-policy.contract';
import { RetryExecutor } from '../resilience/retry-executor';
import { CircuitBreaker } from '../resilience/circuit-breaker/circuit-breaker';
import { HttpClientContract } from '../contracts/http-client.contract';
import { ErrorConverter } from './error.converter';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { HttpAdapterBuilder } from '../builders/http-adapter.builder';
import {
  CorrelationIdConfig,
  DEFAULT_CORRELATION_ID_HEADER,
} from '../models/correlation-id-config';
import { HttpAdapterObserver } from '../observability/http-adapter-observer';
import { RequestOverrides } from '../models/request-overrides';

interface InterceptorGroups {
  request: HttpRequestInterceptor[];
  response: HttpResponseInterceptor[];
  validatedResponse: HttpValidatedResponseInterceptor[];
  error: HttpErrorInterceptor[];
}

/**
 * The core HTTP adapter that orchestrates outbound requests.
 *
 * This class acts as a flexible and resilient HTTP client wrapper. It supports:
 * - **Interceptors**: A chain of middleware to modify requests, responses, and handle errors.
 * - **Retry Policies**: Configurable strategies for handling transient failures (e.g., exponential backoff).
 * - **Observability**: A read-only observer for request lifecycle events (start, success, failure, retry).
 * - **Strong Typing**: Generic support for typed response payloads.
 *
 * It is designed to be immutable in its configuration but can handle concurrent requests.
 */
export class HttpAdapter {
  private readonly interceptors: HttpInterceptor[];
  private readonly defaultInterceptorGroups: InterceptorGroups;

  /**
   * Initializes a new instance of the HttpAdapter class.
   *
   * @param interceptors - Ordered list of interceptors to apply on every request/response/error.
   * @param httpClient - The underlying HTTP client used for network transport.
   * @param retryPolicy - Optional resiliency policy; if absent, no retries are attempted.
   * @param circuitBreaker - Optional circuit breaker for fault isolation.
   * @param correlationIdConfig - Optional global correlation ID propagation configuration.
   * @param observer - Optional observer for request lifecycle telemetry.
   */
  private constructor(
    interceptors: HttpInterceptor[],
    private readonly httpClient: HttpClientContract,
    private readonly retryPolicy?: RetryPolicy,
    private readonly circuitBreaker?: CircuitBreaker,
    private readonly correlationIdConfig?: CorrelationIdConfig,
    private readonly observer?: HttpAdapterObserver,
  ) {
    this.interceptors = interceptors;
    this.defaultInterceptorGroups = this.buildInterceptorGroups(interceptors);
  }

  /**
   * Factory method to create a properly configured HttpAdapter.
   *
   * @param interceptors - A list of interceptors to register.
   * @param retryPolicy - An optional retry policy for resilience.
   * @param httpClient - An optional custom HTTP client (defaults to `defaultHttpClient`).
   * @param circuitBreaker - An optional circuit breaker instance.
   * @param correlationIdConfig - An optional global correlation ID propagation configuration.
   * @param observer - An optional observer for request lifecycle telemetry.
   * @returns A new instance of `HttpAdapter`.
   */
  public static create(
    interceptors: HttpInterceptor[],
    retryPolicy?: RetryPolicy,
    httpClient?: HttpClientContract,
    circuitBreaker?: CircuitBreaker,
    correlationIdConfig?: CorrelationIdConfig,
    observer?: HttpAdapterObserver,
  ): HttpAdapter {
    return new HttpAdapter(
      interceptors,
      httpClient ?? defaultHttpClient,
      retryPolicy,
      circuitBreaker,
      correlationIdConfig,
      observer,
    );
  }

  /**
   * Returns a new `HttpAdapterBuilder` for fluent, chainable adapter configuration.
   *
   * Prefer this over `HttpAdapter.create()` when configuring multiple options,
   * as it produces more readable and maintainable setup code.
   *
   * @example
   * ```typescript
   * const adapter = HttpAdapter.builder()
   *   .withInterceptor(new AuthInterceptor())
   *   .withRetryPolicy(RetryPolicies.exponential(3))
   *   .withCircuitBreaker({ failureThreshold: 5 })
   *   .withCorrelationId()
   *   .withObserver(new MetricsObserver())
   *   .build();
   * ```
   */
  public static builder(): HttpAdapterBuilder {
    return new HttpAdapterBuilder();
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
    const startTime = Date.now();
    const overrides = request.overrides;

    const effectiveRetryPolicy =
      overrides && 'retryPolicy' in overrides ? overrides.retryPolicy : this.retryPolicy;

    const effectiveCircuitBreaker =
      overrides && 'circuitBreaker' in overrides ? overrides.circuitBreaker : this.circuitBreaker;

    const interceptorGroups =
      overrides?.excludedInterceptors?.length || overrides?.excludedInterceptorInstances?.length
        ? this.buildInterceptorGroups(this.filterInterceptors(overrides))
        : this.defaultInterceptorGroups;

    const executePipeline = () => {
      if (!effectiveRetryPolicy) {
        return this.dispatch<T>(request, interceptorGroups);
      }
      const executor = new RetryExecutor(effectiveRetryPolicy, this.observer);
      return executor.execute(() => this.dispatch<T>(request, interceptorGroups));
    };

    try {
      const response = await (effectiveCircuitBreaker
        ? effectiveCircuitBreaker.execute(executePipeline)
        : executePipeline());

      this.observer?.onRequestSuccess?.(response, Date.now() - startTime);
      return response;
    } catch (error) {
      if (error instanceof BaseAdapterException) {
        this.observer?.onRequestFailure?.(error, Date.now() - startTime);
      }
      throw error;
    }
  }

  /**
   * Orchestrates the full request lifecycle: interceptors → HTTP call → validation → response.
   *
   * @private
   */
  private async dispatch<T = unknown>(
    request: Request,
    interceptorGroups: InterceptorGroups,
  ): Promise<Response<T>> {
    const processedRequest = await this.runRequestInterceptors(request, interceptorGroups.request);

    let requestContext: RequestContext | undefined;

    try {
      const url = this.buildRequestUrl(processedRequest);

      requestContext = {
        method: processedRequest.method as string,
        url: url.toString(),
        correlationId: processedRequest.systemCorrelationId,
      };

      processedRequest.setTimestamp(new Date());
      this.applyCorrelationIdHeader(processedRequest);

      this.observer?.onRequestStart?.(processedRequest);

      const response = await this.executeHttpCall<T>(processedRequest, url, requestContext);
      const interceptedResponse = await this.runResponseInterceptors<T>(
        response,
        interceptorGroups.response,
      );
      await this.runValidators<T>(interceptedResponse, request);
      return await this.runPostValidationInterceptors<T>(
        interceptedResponse,
        interceptorGroups.validatedResponse,
      );
    } catch (error) {
      const propagatedError = await this.runErrorInterceptors(
        ErrorConverter.toAdapterException(error, requestContext),
        processedRequest,
        interceptorGroups.error,
      );
      throw propagatedError;
    }
  }

  /**
   * Builds pre-filtered interceptor groups from a raw interceptor list.
   *
   * @private
   */
  private buildInterceptorGroups(interceptors: HttpInterceptor[]): InterceptorGroups {
    return {
      request: interceptors.filter(
        (i): i is HttpRequestInterceptor => typeof i.onRequest === 'function',
      ),
      response: interceptors.filter(
        (i): i is HttpResponseInterceptor => typeof i.onResponse === 'function',
      ),
      validatedResponse: interceptors.filter(
        (i): i is HttpValidatedResponseInterceptor => typeof i.onResponseValidated === 'function',
      ),
      error: interceptors.filter((i): i is HttpErrorInterceptor => typeof i.onError === 'function'),
    };
  }

  /**
   * Filters the raw interceptor list based on request-level exclusions.
   *
   * @private
   */
  private filterInterceptors(overrides: RequestOverrides): HttpInterceptor[] {
    return this.interceptors.filter((interceptor) => {
      if (overrides.excludedInterceptors?.some((cls) => interceptor instanceof cls)) {
        return false;
      }
      if (overrides.excludedInterceptorInstances?.includes(interceptor)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Runs all request-side interceptors in registration order.
   *
   * @private
   */
  private async runRequestInterceptors(
    request: Request,
    interceptors: HttpRequestInterceptor[],
  ): Promise<Request> {
    let processedRequest = request;
    for (const interceptor of interceptors) {
      processedRequest = await interceptor.onRequest(processedRequest);
    }
    return processedRequest;
  }

  /**
   * Builds the final request URL including query parameters.
   *
   * @private
   */
  private buildRequestUrl(request: Request): URL {
    const url = new URL(request.endpoint, request.baseUrl);
    const searchParams = new URLSearchParams(request.queryParams);
    if (searchParams.toString()) {
      url.search = searchParams.toString();
    }
    return url;
  }

  /**
   * Delegates the HTTP call to the underlying client and constructs a typed response.
   *
   * @private
   */
  private async executeHttpCall<T>(
    request: Request,
    url: URL,
    requestContext: RequestContext,
  ): Promise<Response<T>> {
    const clientResponse = await this.httpClient.request<T>({
      url: url.toString(),
      method: request.method,
      data: request.body,
      headers: request.headers,
      timeout: request.options?.timeout,
    });

    return Response.create<T>(
      clientResponse.data,
      clientResponse.status,
      clientResponse.headers ?? null,
      requestContext,
    );
  }

  /**
   * Runs all response-side interceptors in registration order.
   * Fires regardless of validation outcome.
   *
   * @private
   */
  private async runResponseInterceptors<T>(
    response: Response<T>,
    interceptors: HttpResponseInterceptor[],
  ): Promise<Response<T>> {
    let result = response;
    for (const interceptor of interceptors) {
      result = (await interceptor.onResponse(result)) as Response<T>;
    }
    return result;
  }

  /**
   * Runs all registered response validators sequentially.
   * Non-`BaseAdapterException` errors are wrapped in `ValidationException`.
   *
   * @private
   */
  private async runValidators<T>(response: Response<T>, request: Request): Promise<void> {
    for (const validator of request.validators) {
      try {
        await validator.validate(response);
      } catch (err) {
        if (err instanceof BaseAdapterException) throw err;
        throw new ValidationException('Response validation failed', response, err);
      }
    }
  }

  /**
   * Runs post-validation interceptors — only reached when all validators pass.
   *
   * @private
   */
  private async runPostValidationInterceptors<T>(
    response: Response<T>,
    interceptors: HttpValidatedResponseInterceptor[],
  ): Promise<Response<T>> {
    let result = response;
    for (const interceptor of interceptors) {
      result = (await interceptor.onResponseValidated(result)) as Response<T>;
    }
    return result;
  }

  /**
   * Runs all error-side interceptors in registration order.
   *
   * @private
   */
  private async runErrorInterceptors(
    error: BaseAdapterException,
    request: Request,
    interceptors: HttpErrorInterceptor[],
  ): Promise<BaseAdapterException> {
    let propagatedError = error;
    for (const interceptor of interceptors) {
      propagatedError = await interceptor.onError(propagatedError, request);
    }
    return propagatedError;
  }

  /**
   * Injects the correlation ID as an outgoing header when propagation is enabled.
   *
   * Resolution order:
   * 1. Per-request override (`request.correlationIdConfig`) — takes precedence.
   * 2. Adapter-level config (`this.correlationIdConfig`) — global default.
   * 3. If neither enables propagation, no header is added.
   *
   * The header name resolves as: per-request header → adapter header → `x-correlation-id`.
   *
   * @private
   */
  private applyCorrelationIdHeader(request: Request): void {
    const effectiveConfig = request.correlationIdConfig ?? this.correlationIdConfig;

    if (!effectiveConfig?.enabled) return;

    const headerName =
      request.correlationIdConfig?.header ??
      this.correlationIdConfig?.header ??
      DEFAULT_CORRELATION_ID_HEADER;

    request.addHeader(headerName, request.systemCorrelationId);
  }
}
