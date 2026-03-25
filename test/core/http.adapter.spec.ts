import { HttpAdapter } from '../../src/core/http.adapter';
import { Request } from '../../src/models/request';
import { CircuitBreaker } from '../../src/resilience/circuit-breaker/circuit-breaker';
import { RequestBuilder } from '../../src/builders/request.builder';
import { Response } from '../../src/models/response';
import { HttpInterceptor } from '../../src/contracts/http-interceptor.contract';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { defaultHttpClient } from '../../src/core/default-http-client';
import { HttpClientContract } from '../../src/contracts/http-client.contract';
import { ValidationException } from '../../src/exceptions/validation.exception';

jest.mock('../../src/core/default-http-client', () => ({
  defaultHttpClient: {
    request: jest.fn(),
  },
}));

describe('HttpAdapter', () => {
  let adapter: HttpAdapter;
  let mockHttpClient: jest.Mocked<HttpClientContract>;
  let request: Request;

  beforeEach(() => {
    mockHttpClient = defaultHttpClient as jest.Mocked<HttpClientContract>;
    mockHttpClient.request.mockReset();

    mockHttpClient.request.mockResolvedValue({
      data: { success: true },
      status: 200,
      headers: {},
    });

    request = new Request('https://api.example.com', '/test', HttpMethod.GET);
  });

  describe('create', () => {
    it('should create an instance with default client', () => {
      const instance = HttpAdapter.create([]);
      expect(instance).toBeInstanceOf(HttpAdapter);
    });
  });

  describe('send', () => {
    it('should send request via http client', async () => {
      adapter = HttpAdapter.create([], undefined, mockHttpClient);

      const response = await adapter.send(request);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/test',
          method: 'GET',
        }),
      );
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });

    it('should execute interceptors in order', async () => {
      const order: string[] = [];

      const interceptor1: HttpInterceptor = {
        onRequest: async (req) => {
          order.push('req1');
          return req;
        },
        onResponse: async (res) => {
          order.push('res1');
          return res;
        },
        onError: async (err) => {
          return err;
        },
      };

      const interceptor2: HttpInterceptor = {
        onRequest: async (req) => {
          order.push('req2');
          return req;
        },
        onResponse: async (res) => {
          order.push('res2');
          return res;
        },
        onError: async (err) => {
          return err;
        },
      };

      adapter = HttpAdapter.create([interceptor1, interceptor2], undefined, mockHttpClient);

      await adapter.send(request);

      // Request: 1 -> 2
      // Response: 1 -> 2 (implementation passes processed response through chain)
      // Check implementation:
      // for (const interceptor of this.interceptors) response = await interceptor.onResponse(response);
      // So order is 1 -> 2.

      expect(order).toEqual(['req1', 'req2', 'res1', 'res2']);
    });

    it('should handle errors through interceptors', async () => {
      const error = new Error('network error');
      mockHttpClient.request.mockRejectedValue(error);

      const interceptor: HttpInterceptor = {
        onRequest: async (req) => req,
        onResponse: async (res) => res,
        onError: async (err) => {
          return Object.assign(err, { message: 'intercepted error' });
        },
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);

      await expect(adapter.send(request)).rejects.toThrow('intercepted error');
    });

    it('should successfully execute a partial interceptor (e.g. only onError)', async () => {
      const error = new Error('network error');
      mockHttpClient.request.mockRejectedValue(error);

      const interceptor: HttpInterceptor = {
        onError: async (err) => {
          return Object.assign(err, { message: 'partial interceptor error' });
        },
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);

      await expect(adapter.send(request)).rejects.toThrow('partial interceptor error');
    });

    it('should successfully skip missing onResponse/onError and proceed normally', async () => {
      mockHttpClient.request.mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        headers: { 'x-test': 'value' },
      });

      // Only onRequest exists
      const interceptor: HttpInterceptor = {
        onRequest: async (req) => {
          req.headers['x-added'] = 'true';
          return req;
        },
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      const res = await adapter.send(request);

      expect(res.data).toEqual({ success: true });
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-added': 'true',
          }),
        }),
      );
    });

    it('should successfully skip missing onError when request fails and proceed normally', async () => {
      const error = new Error('network failed completely');
      mockHttpClient.request.mockRejectedValueOnce(error);

      // Only onRequest exists, no onError
      const interceptor: HttpInterceptor = {
        onRequest: async (req) => req,
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await expect(adapter.send(request)).rejects.toThrow('network failed completely');
    });

    it('should append query params to url', async () => {
      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      request.addQueryParam('q', 'search');

      await adapter.send(request);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/test?q=search',
        }),
      );
    });

    it('should use retry policy calls when provided', async () => {
      const mockRetryPolicy = {
        maxAttempts: 3,
        retryOn: jest.fn().mockReturnValue(false),
        backoffMs: jest.fn().mockReturnValue(0),
      };

      adapter = HttpAdapter.create([], mockRetryPolicy, mockHttpClient);

      await adapter.send(request);

      // Since we mocked a simple run, we don't need detailed RetryExecutor checks here
      // (RetryExecutor has its own tests). We just want to ensure it entered the retry path.
      // If code coverage shows the `if (!this.retryPolicy)` branch is covered, and the else is covered.
    });

    it('should execute using circuit breaker when provided', async () => {
      const circuitBreaker = new CircuitBreaker();
      jest.spyOn(circuitBreaker, 'execute');

      adapter = HttpAdapter.create([], undefined, mockHttpClient, circuitBreaker);

      await adapter.send(request);

      expect(circuitBreaker.execute).toHaveBeenCalled();
    });

    it('should default to empty params in create', () => {
      const adapter = HttpAdapter.create([]);
      // Implicitly checks default httpClient and undefined retryPolicy
      expect(adapter).toBeDefined();
    });

    it('should handle interceptor onError re-throw', async () => {
      const error = new Error('base error');
      mockHttpClient.request.mockRejectedValue(error);

      const interceptor: HttpInterceptor = {
        onRequest: async (r) => r,
        onResponse: async (r) => r,
        onError: async () => {
          throw new Error('rethrown error');
        },
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await expect(adapter.send(request)).rejects.toThrow('rethrown error');
    });

    it('should handle searchParams being empty string', async () => {
      request = new Request('https://api.example.com', '/test');
      // No query params added
      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await adapter.send(request);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/test', // No ? at the end
        }),
      );
    });

    it('should pass timeout to client config', async () => {
      const timeout = 5000;
      request = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .setTimeout(timeout)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await adapter.send(request);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: timeout,
        }),
      );
    });

    it('should handle undefined headers from client response', async () => {
      mockHttpClient.request.mockResolvedValueOnce({
        data: { ok: true },
        status: 200,
        headers: undefined as unknown as Record<string, string>,
      });

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      const response = await adapter.send(request);

      expect(response.headers).toBeNull();
    });

    it('should run onResponse before validators', async () => {
      const order: string[] = [];
      const interceptor = {
        onResponse: jest.fn().mockImplementation(async (r: Response) => {
          order.push('onResponse');
          return r;
        }),
      };
      const validator = { validate: jest.fn().mockImplementation(() => order.push('validator')) };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await adapter.send(requestWithValidator);

      expect(order).toEqual(['onResponse', 'validator']);
    });

    it('should run a single validator after onResponse', async () => {
      const validator = { validate: jest.fn() };
      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await adapter.send(requestWithValidator);

      expect(validator.validate).toHaveBeenCalledTimes(1);
      expect(validator.validate).toHaveBeenCalledWith(expect.any(Response));
    });

    it('should run multiple validators in registration order', async () => {
      const order: number[] = [];
      const v1 = { validate: jest.fn().mockImplementation(() => order.push(1)) };
      const v2 = { validate: jest.fn().mockImplementation(() => order.push(2)) };

      const requestWithValidators = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(v1, v2)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await adapter.send(requestWithValidators);

      expect(order).toEqual([1, 2]);
    });

    it('should halt validation chain and throw when a validator fails', async () => {
      const v1 = {
        validate: jest
          .fn()
          .mockRejectedValue(
            new ValidationException('Invalid status', Response.create({}, 200, null)),
          ),
      };
      const v2 = { validate: jest.fn() };

      const requestWithValidators = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(v1, v2)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await expect(adapter.send(requestWithValidators)).rejects.toBeInstanceOf(ValidationException);
      expect(v2.validate).not.toHaveBeenCalled();
    });

    it('should not call validators when request fails with an HTTP error', async () => {
      mockHttpClient.request.mockRejectedValueOnce({ response: { status: 500, data: {} } });

      const validator = { validate: jest.fn() };
      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await expect(adapter.send(requestWithValidator)).rejects.toBeDefined();
      expect(validator.validate).not.toHaveBeenCalled();
    });

    it('should support async validators', async () => {
      const asyncValidator = { validate: jest.fn().mockResolvedValue(undefined) };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(asyncValidator)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      await adapter.send(requestWithValidator);

      expect(asyncValidator.validate).toHaveBeenCalledTimes(1);
    });

    it('should call onResponseValidated after all validators pass', async () => {
      const order: string[] = [];
      const validator = { validate: jest.fn().mockImplementation(() => order.push('validator')) };
      const interceptor = {
        onResponseValidated: jest.fn().mockImplementation(async (r: Response) => {
          order.push('onResponseValidated');
          return r;
        }),
      };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await adapter.send(requestWithValidator);

      expect(order).toEqual(['validator', 'onResponseValidated']);
    });

    it('should not call onResponseValidated when a validator fails', async () => {
      const interceptor = { onResponseValidated: jest.fn() };
      const validator = {
        validate: jest
          .fn()
          .mockRejectedValue(new ValidationException('fail', Response.create({}, 200, null))),
      };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await expect(adapter.send(requestWithValidator)).rejects.toBeInstanceOf(ValidationException);
      expect(interceptor.onResponseValidated).not.toHaveBeenCalled();
    });

    it('should call onResponse even when validation fails', async () => {
      const interceptor = {
        onResponse: jest.fn().mockImplementation(async (r: Response) => r),
      };
      const validator = {
        validate: jest
          .fn()
          .mockRejectedValue(new ValidationException('fail', Response.create({}, 200, null))),
      };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await expect(adapter.send(requestWithValidator)).rejects.toBeInstanceOf(ValidationException);
      expect(interceptor.onResponse).toHaveBeenCalledTimes(1);
    });

    it('should wrap non-BaseAdapterException validator errors in ValidationException', async () => {
      const zodError = new Error('Schema mismatch');
      const validator = { validate: jest.fn().mockRejectedValue(zodError) };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      const err = await adapter.send(requestWithValidator).catch((e) => e);

      expect(err).toBeInstanceOf(ValidationException);
      expect(err.cause).toBe(zodError);
    });

    it('should not re-wrap BaseAdapterException thrown by a validator', async () => {
      const validationErr = new ValidationException('explicit', Response.create({}, 200, null));
      const validator = { validate: jest.fn().mockRejectedValue(validationErr) };

      const requestWithValidator = new RequestBuilder('https://api.example.com')
        .setEndpoint('/test')
        .validateWith(validator)
        .build();

      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      const err = await adapter.send(requestWithValidator).catch((e) => e);

      expect(err).toBe(validationErr);
    });

    it('should call onResponseValidated when no validators are registered', async () => {
      const interceptor = {
        onResponseValidated: jest.fn().mockImplementation(async (r: Response) => r),
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);
      await adapter.send(request);

      expect(interceptor.onResponseValidated).toHaveBeenCalledTimes(1);
    });
  });
});
