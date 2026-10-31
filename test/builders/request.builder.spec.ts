import { RequestBuilder } from '../../src/builders/request.builder';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { ResponseValidator } from '../../src/contracts/response-validator.contract';
import { HttpBody } from '../../src/common/types/http.types';
import { RetryPolicies } from '../../src/resilience/retry.policies';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker/circuit-breaker';

describe('RequestBuilder', () => {
  let builder: RequestBuilder;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    builder = new RequestBuilder(baseUrl);
  });

  it('should initialize with correct base URL', () => {
    const request = builder.build();
    expect(request.baseUrl).toBe(baseUrl);
  });

  it('should set endpoint correctly', () => {
    const endpoint = '/users';
    const request = builder.setEndpoint(endpoint).build();
    expect(request.endpoint).toBe(endpoint);
  });

  it('should set HTTP method correctly', () => {
    const request = builder.setMethod(HttpMethod.GET).build();
    expect(request.method).toBe(HttpMethod.GET);
  });

  it('should default to POST method', () => {
    const request = builder.build();
    expect(request.method).toBe(HttpMethod.POST);
  });

  describe('Content-Type Helpers', () => {
    it('should set JSON content type', () => {
      const request = builder.asJson().build();
      expect(request.headers['Content-Type']).toBe('application/json');
    });

    it('should set XML content type', () => {
      const request = builder.asXml().build();
      expect(request.headers['Content-Type']).toBe('text/xml');
    });

    it('should set Form URL Encoded content type', () => {
      const request = builder.asFormUrlEncoded().build();
      expect(request.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });
  });

  describe('Body Management', () => {
    it('should set full body object', () => {
      const body = { id: 1, name: 'Test' };
      const request = builder.setBody(body).build();
      expect(request.body).toEqual(body);
    });

    it('should add single body param', () => {
      const request = builder.addBodyParam('key', 'value').build();
      expect(request.body).toEqual({ key: 'value' });
    });

    it('should merge multiple body params', () => {
      const request = builder.addBodyParam('key1', 'value1').addBodyParam('key2', 'value2').build();
      expect(request.body).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should remove body param', () => {
      const request = builder.addBodyParam('key1', 'value1').removeBodyParam('key1').build();
      expect(request.body).toEqual({});
    });

    it('should reset body params', () => {
      const request = builder.addBodyParam('a', 1).resetBodyParams().build();
      expect(request.body).toEqual({});
    });

    it('should merge multiple body params via batch method', () => {
      const request = builder.addBodyParam('a', 1).addBodyParams({ b: 2, c: 3 }).build();
      expect(request.body).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should handle undefined body in build', () => {
      // Force body to be undefined to hit the branch
      builder.setBody(undefined as unknown as HttpBody);
      const request = builder.build();
      expect(request.body).toBeNull();
    });
  });

  describe('setRawBody', () => {
    it('should pass the raw body to the request', () => {
      expect(builder.setRawBody('<x/>').build().rawBody).toBe('<x/>');
    });

    it('should be cleared by setBody', () => {
      expect(builder.setRawBody('<x/>').setBody({ a: 1 }).build().rawBody).toBeUndefined();
    });

    it('should leave rawBody undefined by default', () => {
      expect(builder.build().rawBody).toBeUndefined();
    });
  });

  describe('Header Management', () => {
    it('should add single header', () => {
      const request = builder.addHeader('Authorization', 'Bearer token').build();
      expect(request.headers['Authorization']).toBe('Bearer token');
    });

    it('should merge headers', () => {
      const initialHeaders = { 'X-Custom-1': '1' };
      const request = builder.setHeaders(initialHeaders).addHeader('X-Custom-2', '2').build();

      expect(request.headers['X-Custom-1']).toBe('1');
      expect(request.headers['X-Custom-2']).toBe('2');
    });
  });

  describe('Query Params Management', () => {
    it('should add single query param', () => {
      const request = builder.addQueryParam('page', '1').build();
      expect(request.queryParams['page']).toBe('1');
    });

    it('should merge query params', () => {
      const request = builder.addQueryParam('page', '1').addQueryParams({ sort: 'desc' }).build();

      expect(request.queryParams).toEqual({ page: '1', sort: 'desc' });
    });

    it('should remove query param', () => {
      const request = builder.addQueryParam('q', 'test').removeQueryParam('q').build();
      expect(request.queryParams).toEqual({});
    });

    it('should reset query params', () => {
      const request = builder.addQueryParam('q', 'test').resetQueryParams().build();
      expect(request.queryParams).toEqual({});
    });

    it('should replace query params with setQueryParams', () => {
      const request = builder
        .addQueryParam('old', 'value')
        .setQueryParams({ new: 'value' })
        .build();

      expect(request.queryParams).toEqual({ new: 'value' });
      expect(request.queryParams['old']).toBeUndefined();
    });
  });

  describe('Header case-insensitivity', () => {
    it('should replace the default Content-Type with a lowercase override', () => {
      const request = builder.addHeader('content-type', 'text/plain').build();

      expect(request.headers).toEqual({ 'content-type': 'text/plain' });
    });

    it('should remove a header regardless of case', () => {
      expect(builder.removeHeader('content-type').build().headers).toEqual({});
    });

    it('should merge headers case-insensitively', () => {
      const request = builder.addHeaders({ 'CONTENT-TYPE': 'text/xml', 'X-A': '1' }).build();

      expect(request.headers).toEqual({ 'CONTENT-TYPE': 'text/xml', 'X-A': '1' });
    });

    it('should let content-type helpers replace a lowercase header', () => {
      const request = builder.addHeader('content-type', 'text/plain').asXml().build();

      expect(request.headers).toEqual({ 'Content-Type': 'text/xml' });
    });
  });

  describe('Header Management (Batch)', () => {
    it('should add multiple headers', () => {
      const request = builder.addHeaders({ H1: '1', H2: '2' }).build();
      expect(request.headers['H1']).toBe('1');
      expect(request.headers['H2']).toBe('2');
    });

    it('should remove header', () => {
      const request = builder.addHeader('H1', '1').removeHeader('H1').build();
      expect(request.headers['H1']).toBeUndefined();
    });

    it('should reset headers', () => {
      const request = builder.addHeader('H1', '1').resetHeaders().build();
      expect(request.headers).toEqual({});
    });
  });

  describe('Options Management', () => {
    it('should set timeout via helper', () => {
      expect(builder.setTimeout(5000).build().options.timeout).toBe(5000);
    });

    it('should replace options via setOptions', () => {
      expect(builder.setOptions({ timeout: 2000 }).build().options.timeout).toBe(2000);
    });
  });

  describe('Request isolation', () => {
    it('should not share headers between built requests', () => {
      const first = builder.addHeader('X-Base', '1').build();
      const second = builder.build();

      first.addHeader('Authorization', 'Bearer user-1');

      expect(second.headers).toEqual({ 'Content-Type': 'application/json', 'X-Base': '1' });
    });

    it('should not let builder changes after build leak into built requests', () => {
      const request = builder.addHeader('X-A', '1').addQueryParam('q', '1').build();

      builder
        .addHeader('X-B', '2')
        .addQueryParam('p', '2')
        .validateWith({ validate: () => {} });

      expect(request.headers['X-B']).toBeUndefined();
      expect(request.queryParams).toEqual({ q: '1' });
      expect(request.validators).toHaveLength(0);
    });

    it('should not share query params between built requests', () => {
      const first = builder.build();
      const second = builder.build();

      first.addQueryParam('api_key', 'secret');

      expect(second.queryParams).toEqual({});
    });

    it('should deep-copy the body', () => {
      const first = builder.setBody({ card: { number: '4111' } }).build();
      const second = builder.build();

      (first.body!.card as HttpBody).number = '5555';

      expect((second.body!.card as HttpBody).number).toBe('4111');
    });

    it('should not share options between built requests', () => {
      const first = builder.setTimeout(1000).build();
      const second = builder.build();

      first.options.timeout = 1;

      expect(second.options.timeout).toBe(1000);
    });

    it('should not share override exclusion lists between built requests', () => {
      class A {}
      class B {}
      const first = builder.withoutInterceptor(A).build();
      builder.withoutInterceptor(B);

      expect(first.overrides?.excludedInterceptors).toEqual([A]);
    });

    it('should not share correlation id config between built requests', () => {
      const first = builder.withCorrelationId('x-request-id').build();
      const second = builder.build();

      first.correlationIdConfig!.header = 'changed';

      expect(second.correlationIdConfig?.header).toBe('x-request-id');
    });
  });

  describe('validateWith', () => {
    const makeValidator = (): ResponseValidator => ({ validate: jest.fn() });

    it('should register a single validator', () => {
      const validator = makeValidator();
      const request = builder.validateWith(validator).build();
      expect(request.validators).toHaveLength(1);
      expect(request.validators[0]).toBe(validator);
    });

    it('should register multiple validators passed as rest params', () => {
      const v1 = makeValidator();
      const v2 = makeValidator();
      const request = builder.validateWith(v1, v2).build();
      expect(request.validators).toHaveLength(2);
      expect(request.validators[0]).toBe(v1);
      expect(request.validators[1]).toBe(v2);
    });

    it('should accumulate validators across multiple calls', () => {
      const v1 = makeValidator();
      const v2 = makeValidator();
      const request = builder.validateWith(v1).validateWith(v2).build();
      expect(request.validators).toHaveLength(2);
    });

    it('should default to empty validators array when not called', () => {
      const request = builder.build();
      expect(request.validators).toEqual([]);
    });

    it('should return the builder instance for chaining', () => {
      expect(builder.validateWith(makeValidator())).toBe(builder);
    });
  });

  describe('withCorrelationId', () => {
    it('should set correlationIdConfig with enabled: true and no header', () => {
      const request = builder.withCorrelationId().build();
      expect(request.correlationIdConfig).toEqual({ enabled: true, header: undefined });
    });

    it('should set correlationIdConfig with custom header', () => {
      const request = builder.withCorrelationId('x-request-id').build();
      expect(request.correlationIdConfig).toEqual({ enabled: true, header: 'x-request-id' });
    });

    it('should return the builder instance for chaining', () => {
      expect(builder.withCorrelationId()).toBe(builder);
    });
  });

  describe('withoutCorrelationId', () => {
    it('should set correlationIdConfig with enabled: false', () => {
      const request = builder.withoutCorrelationId().build();
      expect(request.correlationIdConfig).toEqual({ enabled: false });
    });

    it('should override a previous withCorrelationId call', () => {
      const request = builder.withCorrelationId().withoutCorrelationId().build();
      expect(request.correlationIdConfig?.enabled).toBe(false);
    });

    it('should return the builder instance for chaining', () => {
      expect(builder.withoutCorrelationId()).toBe(builder);
    });
  });

  describe('correlationIdConfig default', () => {
    it('should be undefined when neither withCorrelationId nor withoutCorrelationId is called', () => {
      const request = builder.build();
      expect(request.correlationIdConfig).toBeUndefined();
    });
  });

  describe('Request-level Overrides', () => {
    describe('withRetryPolicy', () => {
      it('should set retryPolicy override on the request', () => {
        const policy = RetryPolicies.exponential(3);
        const request = builder.withRetryPolicy(policy).build();
        expect(request.overrides?.retryPolicy).toBe(policy);
      });

      it('should return the builder instance for chaining', () => {
        expect(builder.withRetryPolicy(RetryPolicies.exponential(3))).toBe(builder);
      });
    });

    describe('withoutRetry', () => {
      it('should set retryPolicy override to null', () => {
        const request = builder.withoutRetry().build();
        expect(request.overrides?.retryPolicy).toBeNull();
      });

      it('should return the builder instance for chaining', () => {
        expect(builder.withoutRetry()).toBe(builder);
      });
    });

    describe('withCircuitBreaker', () => {
      it('should set circuitBreaker override on the request', () => {
        const cb = new CircuitBreaker({ failureThreshold: 3 });
        const request = builder.withCircuitBreaker(cb).build();
        expect(request.overrides?.circuitBreaker).toBe(cb);
      });

      it('should return the builder instance for chaining', () => {
        expect(builder.withCircuitBreaker(new CircuitBreaker({ failureThreshold: 3 }))).toBe(
          builder,
        );
      });
    });

    describe('withoutCircuitBreaker', () => {
      it('should set circuitBreaker override to null', () => {
        const request = builder.withoutCircuitBreaker().build();
        expect(request.overrides?.circuitBreaker).toBeNull();
      });

      it('should return the builder instance for chaining', () => {
        expect(builder.withoutCircuitBreaker()).toBe(builder);
      });
    });

    describe('withoutInterceptor', () => {
      it('should add interceptor classes to excludedInterceptors', () => {
        class FooInterceptor {}
        class BarInterceptor {}
        const request = builder.withoutInterceptor(FooInterceptor, BarInterceptor).build();
        expect(request.overrides?.excludedInterceptors).toEqual([FooInterceptor, BarInterceptor]);
      });

      it('should accumulate classes across multiple calls', () => {
        class FooInterceptor {}
        class BarInterceptor {}
        const request = builder
          .withoutInterceptor(FooInterceptor)
          .withoutInterceptor(BarInterceptor)
          .build();
        expect(request.overrides?.excludedInterceptors).toEqual([FooInterceptor, BarInterceptor]);
      });

      it('should return the builder instance for chaining', () => {
        class FooInterceptor {}
        expect(builder.withoutInterceptor(FooInterceptor)).toBe(builder);
      });
    });

    describe('withoutInterceptorInstance', () => {
      it('should add interceptor instances to excludedInterceptorInstances', () => {
        const instance = { onRequest: async (r: unknown) => r };
        const request = builder.withoutInterceptorInstance(instance).build();
        expect(request.overrides?.excludedInterceptorInstances).toContain(instance);
      });

      it('should accumulate instances across multiple calls', () => {
        const i1 = { onRequest: async (r: unknown) => r };
        const i2 = { onResponse: async (r: unknown) => r };
        const request = builder
          .withoutInterceptorInstance(i1)
          .withoutInterceptorInstance(i2)
          .build();
        expect(request.overrides?.excludedInterceptorInstances).toEqual([i1, i2]);
      });

      it('should return the builder instance for chaining', () => {
        expect(builder.withoutInterceptorInstance({ onRequest: async (r: unknown) => r })).toBe(
          builder,
        );
      });
    });

    describe('overrides field on request', () => {
      it('should be undefined when no override methods are called', () => {
        const request = builder.build();
        expect(request.overrides).toBeUndefined();
      });
    });
  });
});
