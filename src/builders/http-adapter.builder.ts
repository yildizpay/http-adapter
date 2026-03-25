import { HttpAdapter } from '../core/http.adapter';
import { HttpInterceptor } from '../contracts/http-interceptor.contract';
import { RetryPolicy } from '../contracts/retry-policy.contract';
import { HttpClientContract } from '../contracts/http-client.contract';
import { CircuitBreaker } from '../resilience/circuit-breaker/circuit-breaker';
import { CircuitBreakerOptions } from '../resilience/circuit-breaker/circuit-breaker-options';

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
 *   .build();
 * ```
 */
export class HttpAdapterBuilder {
  private readonly interceptors: HttpInterceptor[] = [];
  private retryPolicy: RetryPolicy | undefined;
  private httpClient: HttpClientContract | undefined;
  private circuitBreaker: CircuitBreaker | undefined;

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
    );
  }
}
