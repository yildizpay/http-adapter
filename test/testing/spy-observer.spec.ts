import { SpyObserver } from '../../src/testing/spy-observer';
import { Request } from '../../src/models/request';
import { Response } from '../../src/models/response';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';

const makeRequest = (): Request => new Request('https://api.example.com', '/test', HttpMethod.GET);

const makeResponse = (): Response => Response.create({ ok: true }, 200, {});

const makeError = (): BaseAdapterException => new BaseAdapterException('TEST_ERROR', 'test error');

describe('SpyObserver', () => {
  let spy: SpyObserver;

  beforeEach(() => {
    spy = new SpyObserver();
  });

  describe('onRequestStart', () => {
    it('should record the request', () => {
      const request = makeRequest();
      spy.onRequestStart(request);

      expect(spy.requestStartCalls).toHaveLength(1);
      expect(spy.requestStartCalls[0]).toBe(request);
    });

    it('should accumulate multiple calls in order', () => {
      const r1 = makeRequest();
      const r2 = makeRequest();

      spy.onRequestStart(r1);
      spy.onRequestStart(r2);

      expect(spy.requestStartCalls).toHaveLength(2);
      expect(spy.requestStartCalls[0]).toBe(r1);
      expect(spy.requestStartCalls[1]).toBe(r2);
    });
  });

  describe('onRequestSuccess', () => {
    it('should record the response and duration', () => {
      const response = makeResponse();
      spy.onRequestSuccess(response, 123);

      expect(spy.successCalls).toHaveLength(1);
      expect(spy.successCalls[0].response).toBe(response);
      expect(spy.successCalls[0].durationMs).toBe(123);
    });
  });

  describe('onRequestFailure', () => {
    it('should record the error and duration', () => {
      const error = makeError();
      spy.onRequestFailure(error, 456);

      expect(spy.failureCalls).toHaveLength(1);
      expect(spy.failureCalls[0].error).toBe(error);
      expect(spy.failureCalls[0].durationMs).toBe(456);
    });
  });

  describe('onRetry', () => {
    it('should record the attempt, error and delay', () => {
      const error = makeError();
      spy.onRetry(2, error, 1000);

      expect(spy.retryCalls).toHaveLength(1);
      expect(spy.retryCalls[0].attempt).toBe(2);
      expect(spy.retryCalls[0].error).toBe(error);
      expect(spy.retryCalls[0].delayMs).toBe(1000);
    });
  });

  describe('reset', () => {
    it('should clear all recorded calls', () => {
      spy.onRequestStart(makeRequest());
      spy.onRequestSuccess(makeResponse(), 100);
      spy.onRequestFailure(makeError(), 200);
      spy.onRetry(1, makeError(), 500);

      spy.reset();

      expect(spy.requestStartCalls).toHaveLength(0);
      expect(spy.successCalls).toHaveLength(0);
      expect(spy.failureCalls).toHaveLength(0);
      expect(spy.retryCalls).toHaveLength(0);
    });
  });
});
