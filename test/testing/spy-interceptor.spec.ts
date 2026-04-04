import { SpyInterceptor } from '../../src/testing/spy-interceptor';
import { Request } from '../../src/models/request';
import { Response } from '../../src/models/response';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';

const makeRequest = (): Request => new Request('https://api.example.com', '/test', HttpMethod.GET);

const makeResponse = (): Response => Response.create({ ok: true }, 200, {});

const makeError = (): BaseAdapterException => new BaseAdapterException('TEST_ERROR', 'test error');

describe('SpyInterceptor', () => {
  let spy: SpyInterceptor;

  beforeEach(() => {
    spy = new SpyInterceptor();
  });

  describe('onRequest', () => {
    it('should record the request and return it unchanged', async () => {
      const request = makeRequest();
      const result = await spy.onRequest(request);

      expect(result).toBe(request);
      expect(spy.requestCalls).toHaveLength(1);
      expect(spy.requestCalls[0]).toBe(request);
    });

    it('should accumulate multiple calls in order', async () => {
      const r1 = makeRequest();
      const r2 = makeRequest();

      await spy.onRequest(r1);
      await spy.onRequest(r2);

      expect(spy.requestCalls).toHaveLength(2);
      expect(spy.requestCalls[0]).toBe(r1);
      expect(spy.requestCalls[1]).toBe(r2);
    });
  });

  describe('onResponse', () => {
    it('should record the response and return it unchanged', async () => {
      const response = makeResponse();
      const result = await spy.onResponse(response);

      expect(result).toBe(response);
      expect(spy.responseCalls).toHaveLength(1);
      expect(spy.responseCalls[0]).toBe(response);
    });
  });

  describe('onResponseValidated', () => {
    it('should record the validated response and return it unchanged', async () => {
      const response = makeResponse();
      const result = await spy.onResponseValidated(response);

      expect(result).toBe(response);
      expect(spy.responseValidatedCalls).toHaveLength(1);
      expect(spy.responseValidatedCalls[0]).toBe(response);
    });
  });

  describe('onError', () => {
    it('should record the error and request, and return the error unchanged', async () => {
      const error = makeError();
      const request = makeRequest();
      const result = await spy.onError(error, request);

      expect(result).toBe(error);
      expect(spy.errorCalls).toHaveLength(1);
      expect(spy.errorCalls[0].error).toBe(error);
      expect(spy.errorCalls[0].request).toBe(request);
    });
  });

  describe('reset', () => {
    it('should clear all recorded calls', async () => {
      await spy.onRequest(makeRequest());
      await spy.onResponse(makeResponse());
      await spy.onResponseValidated(makeResponse());
      await spy.onError(makeError(), makeRequest());

      spy.reset();

      expect(spy.requestCalls).toHaveLength(0);
      expect(spy.responseCalls).toHaveLength(0);
      expect(spy.responseValidatedCalls).toHaveLength(0);
      expect(spy.errorCalls).toHaveLength(0);
    });
  });
});
