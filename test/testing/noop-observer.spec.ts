import { NoopObserver } from '../../src/testing/noop-observer';
import { Request } from '../../src/models/request';
import { Response } from '../../src/models/response';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';

const makeRequest = (): Request => new Request('https://api.example.com', '/test', HttpMethod.GET);

const makeResponse = (): Response => Response.create({ ok: true }, 200, {});

const makeError = (): BaseAdapterException => new BaseAdapterException('TEST_ERROR', 'test error');

describe('NoopObserver', () => {
  let observer: NoopObserver;

  beforeEach(() => {
    observer = new NoopObserver();
  });

  it('should not throw when onRequestStart is called', () => {
    expect(() => observer.onRequestStart(makeRequest())).not.toThrow();
  });

  it('should not throw when onRequestSuccess is called', () => {
    expect(() => observer.onRequestSuccess(makeResponse(), 100)).not.toThrow();
  });

  it('should not throw when onRequestFailure is called', () => {
    expect(() => observer.onRequestFailure(makeError(), 100)).not.toThrow();
  });

  it('should not throw when onRetry is called', () => {
    expect(() => observer.onRetry(1, makeError(), 500)).not.toThrow();
  });
});
