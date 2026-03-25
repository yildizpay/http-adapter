import { HttpAdapter } from '../core/http.adapter';
import { HttpInterceptor } from '../contracts/http-interceptor.contract';
import { RetryPolicy } from '../contracts/retry-policy.contract';
import { HttpClientContract } from '../contracts/http-client.contract';
import { CircuitBreaker } from '../resilience/circuit-breaker/circuit-breaker';
import { CircuitBreakerOptions } from '../resilience/circuit-breaker/circuit-breaker-options';
import { CorrelationIdConfig, DEFAULT_CORRELATION_ID_HEADER } from '../models/correlation-id-config';

/**
 * A fluent builder for constructing a fully configured `HttpAdapter` instance.
 *
 * Provides a readable, chainable alternative to `HttpAdapter.create()`, making
 * complex adapter configurations easier to express and maintain — especially in
 * dependency injection containers.
 *
 * @example
 * ```typescript
 * const adapter = new HttpAdapterBuilder()
 *   .withInterceptor(new AuthInterceptor(), new LoggingInterceptor())
 *   .withRetryPolicy(RetryPolicies.exponential(3))
 *   .withCircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30000 })
 *   .withCorrelationId()
 *   .build();
 * ```
 */
export class HttpAdapterBuilder {
  private readonly interceptors: HttpInterceptor[] = [];
  private retryPolicy: RetryPolicy | undefined;
  private httpClient: HttpClientContract | undefined;
  private circuitBreaker: CircuitBreaker | undefined;
  private correlationIdConfig: CorrelationIdConfig | undefined;

  /**
   * Registers one or more interceptors. Can be called multiple times — interceptors
   * accumulate in registration order.
   *
   * @param interceptors - One or more interceptor instances to register.
   */
  public withInterceptor(...interceptors: HttpInterceptor[]): this {
    this.interceptors.push(...interceptors);
    return this;
  }

  /**
   * Sets the retry policy for the adapter.
   *
   * @param policy - A `RetryPolicy` implementation (e.g. `RetryPolicies.exponential(3)`).
   */
  public withRetryPolicy(policy: RetryPolicy): this {
    this.retryPolicy = policy;
    return this;
  }

  /**
   * Sets the circuit breaker for the adapter.
   *
   * Accepts either a pre-configured `CircuitBreaker` instance or a plain
   * `CircuitBreakerOptions` object — in the latter case the instance is created
   * automatically.
   *
   * @param breaker - A `CircuitBreaker` instance or `CircuitBreakerOptions` config object.
   */
  public withCircuitBreaker(breaker: CircuitBreaker | CircuitBreakerOptions): this {
    this.circuitBreaker = breaker instanceof CircuitBreaker ? breaker : new CircuitBreaker(breaker);
    return this;
  }

  /**
   * Overrides the default HTTP client used for transport.
   *
   * Useful for testing or when integrating a custom fetch implementation.
   *
   * @param client - A custom `HttpClientContract` implementation.
   */
  public withHttpClient(client: HttpClientContract): this {
    this.httpClient = client;
    return this;
  }

  /**
   * Enables correlation ID propagation for all requests made by this adapter.
   *
   * The correlation ID is always generated and tracked internally (for logging and
   * error context). This method controls whether it is also forwarded as an outgoing
   * request header to downstream services.
   *
   * Propagation is **disabled by default** — call this method to opt in.
   *
   * @param header - The header name to use. Defaults to `'x-correlation-id'`.
   * @returns The current instance of HttpAdapterBuilder for method chaining.
   *
   * @example
   * ```typescript
   * builder.withCorrelationId()                 // use default 'x-correlation-id' header
   * builder.withCorrelationId('x-request-id')   // use a custom header name
   * ```
   */
  public withCorrelationId(header?: string): this {
    this.correlationIdConfig = { enabled: true, header: header ?? DEFAULT_CORRELATION_ID_HEADER };
    return this;
  }

  /**
   * Builds and returns a configured `HttpAdapter` instance.
   *
   * @returns A new `HttpAdapter` ready to send requests.
   */
  public build(): HttpAdapter {
    return HttpAdapter.create(
      this.interceptors,
      this.retryPolicy,
      this.httpClient,
      this.circuitBreaker,
      this.correlationIdConfig,
    );
  }
}
