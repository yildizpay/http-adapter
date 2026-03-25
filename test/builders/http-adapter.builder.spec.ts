import { HttpAdapterBuilder } from '../../src/builders/http-adapter.builder';
import { HttpAdapter } from '../../src/core/http.adapter';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker/circuit-breaker';
import { RetryPolicies } from '../../src/resilience/retry.policies';
import { HttpInterceptor } from '../../src/contracts/http-interceptor.contract';
import { HttpClientContract } from '../../src/contracts/http-client.contract';

describe('HttpAdapterBuilder', () => {
  it('should build an HttpAdapter with no configuration', () => {
    const adapter = new HttpAdapterBuilder().build();
    expect(adapter).toBeInstanceOf(HttpAdapter);
  });

  it('should be accessible via HttpAdapter.builder()', () => {
    const builder = HttpAdapter.builder();
    expect(builder).toBeInstanceOf(HttpAdapterBuilder);
    expect(builder.build()).toBeInstanceOf(HttpAdapter);
  });

  describe('withInterceptor', () => {
    it('should register a single interceptor', () => {
      const interceptor: HttpInterceptor = { onRequest: async (r) => r };
      const adapter = new HttpAdapterBuilder().withInterceptor(interceptor).build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should register multiple interceptors via rest params', () => {
      const i1: HttpInterceptor = { onRequest: async (r) => r };
      const i2: HttpInterceptor = { onResponse: async (r) => r };
      const adapter = new HttpAdapterBuilder().withInterceptor(i1, i2).build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should accumulate interceptors across multiple calls', () => {
      const i1: HttpInterceptor = { onRequest: async (r) => r };
      const i2: HttpInterceptor = { onResponse: async (r) => r };
      const adapter = new HttpAdapterBuilder().withInterceptor(i1).withInterceptor(i2).build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should return the builder instance for chaining', () => {
      const builder = new HttpAdapterBuilder();
      expect(builder.withInterceptor({ onRequest: async (r) => r })).toBe(builder);
    });
  });

  describe('withRetryPolicy', () => {
    it('should set a retry policy', () => {
      const adapter = new HttpAdapterBuilder()
        .withRetryPolicy(RetryPolicies.exponential(3))
        .build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should return the builder instance for chaining', () => {
      const builder = new HttpAdapterBuilder();
      expect(builder.withRetryPolicy(RetryPolicies.exponential(3))).toBe(builder);
    });
  });

  describe('withCircuitBreaker', () => {
    it('should accept a CircuitBreaker instance', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const adapter = new HttpAdapterBuilder().withCircuitBreaker(breaker).build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should accept CircuitBreakerOptions and create the instance internally', () => {
      const adapter = new HttpAdapterBuilder()
        .withCircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30000 })
        .build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should return the builder instance for chaining', () => {
      const builder = new HttpAdapterBuilder();
      expect(builder.withCircuitBreaker({ failureThreshold: 3 })).toBe(builder);
    });
  });

  describe('withHttpClient', () => {
    it('should set a custom HTTP client', () => {
      const client: HttpClientContract = { request: jest.fn() };
      const adapter = new HttpAdapterBuilder().withHttpClient(client).build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should return the builder instance for chaining', () => {
      const builder = new HttpAdapterBuilder();
      expect(builder.withHttpClient({ request: jest.fn() })).toBe(builder);
    });
  });

  describe('withCorrelationId', () => {
    it('should enable propagation with default header', () => {
      const adapter = new HttpAdapterBuilder().withCorrelationId().build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should enable propagation with a custom header', () => {
      const adapter = new HttpAdapterBuilder().withCorrelationId('x-request-id').build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });

    it('should return the builder instance for chaining', () => {
      const builder = new HttpAdapterBuilder();
      expect(builder.withCorrelationId()).toBe(builder);
    });
  });

  describe('full configuration', () => {
    it('should build a fully configured adapter', () => {
      const adapter = new HttpAdapterBuilder()
        .withInterceptor({ onRequest: async (r) => r })
        .withRetryPolicy(RetryPolicies.exponential(3))
        .withCircuitBreaker({ failureThreshold: 5 })
        .withHttpClient({ request: jest.fn() })
        .withCorrelationId()
        .build();
      expect(adapter).toBeInstanceOf(HttpAdapter);
    });
  });
});
