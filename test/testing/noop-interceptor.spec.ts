import { NoopInterceptor } from '../../src/testing/noop-interceptor';
import { Request } from '../../src/models/request';
import { Response } from '../../src/models/response';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';

const makeRequest = (): Request => new Request('https://api.example.com', '/test', HttpMethod.GET);

const makeResponse = (): Response => Response.create({ ok: true }, 200, {});

const makeError = (): BaseAdapterException => new BaseAdapterException('TEST_ERROR', 'test error');

describe('NoopInterceptor', () => {
  let interceptor: NoopInterceptor;

  beforeEach(() => {
    interceptor = new NoopInterceptor();
  });

  describe('onRequest', () => {
    it('should return the original request unchanged', async () => {
      const request = makeRequest();
      const result = await interceptor.onRequest(request);
      expect(result).toBe(request);
    });
  });

  describe('onResponse', () => {
    it('should return the original response unchanged', async () => {
      const response = makeResponse();
      const result = await interceptor.onResponse(response);
      expect(result).toBe(response);
    });
  });

  describe('onResponseValidated', () => {
    it('should return the original response unchanged', async () => {
      const response = makeResponse();
      const result = await interceptor.onResponseValidated(response);
      expect(result).toBe(response);
    });
  });

  describe('onError', () => {
    it('should return the original error unchanged', async () => {
      const error = makeError();
      const request = makeRequest();
      const result = await interceptor.onError(error, request);
      expect(result).toBe(error);
    });
  });
});
