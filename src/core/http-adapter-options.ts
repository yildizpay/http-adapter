import type { HttpClientContract } from '../contracts/http-client.contract';
import type { HttpInterceptor } from '../contracts/http-interceptor.contract';
import type { RetryPolicy } from '../contracts/retry-policy.contract';
import type { CorrelationIdConfig } from '../models/correlation-id-config';
import type { HttpAdapterObserver } from '../observability/http-adapter-observer';
import type { CircuitBreaker } from '../resilience/circuit-breaker/circuit-breaker';
import type { CircuitBreakerOptions } from '../resilience/circuit-breaker/circuit-breaker-options';

/**
 * Configuration for {@link HttpAdapter.create}. Every option is optional.
 */
export interface HttpAdapterOptions {
  /** Interceptors applied to every request, response and error, in order. */
  interceptors?: HttpInterceptor[];
  /** Retry strategy for transient failures. Without one, no request is retried. */
  retryPolicy?: RetryPolicy;
  /** Transport used to send requests. Defaults to the built-in `fetch` client. */
  httpClient?: HttpClientContract;
  /** A circuit breaker instance, or options to create one. */
  circuitBreaker?: CircuitBreaker | CircuitBreakerOptions;
  /** Correlation ID propagation for every request. */
  correlationId?: CorrelationIdConfig;
  /** Read-only observer for request lifecycle telemetry. */
  observer?: HttpAdapterObserver;
}
