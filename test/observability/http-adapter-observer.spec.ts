import { HttpAdapter } from '../../src/core/http.adapter';
import { HttpAdapterObserver } from '../../src/observability/http-adapter-observer';
import { RequestBuilder } from '../../src/builders/request.builder';
import { Response } from '../../src/models/response';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { RetryPolicies } from '../../src/resilience/retry.policies';
import { TimeoutException } from '../../src/exceptions/network.exceptions';

const makeRequest = () =>
  new RequestBuilder('https://api.example.com').setEndpoint('/test').build();

const mockClient = (
  impl: () => Promise<{ data: any; status: number; headers: Record<string, string> }>,
) => ({
  request: jest.fn(impl),
});

describe('HttpAdapterObserver', () => {
  describe('onRequestStart', () => {
    it('should fire after request interceptors, before HTTP call', async () => {
      const order: string[] = [];
      const observer: HttpAdapterObserver = {
        onRequestStart: () => {
          order.push('observer:start');
        },
      };

      const adapter = HttpAdapter.create(
        [],
        undefined,
        mockClient(async () => {
          order.push('http:call');
          return { data: {}, status: 200, headers: {} };
        }),
        undefined,
        undefined,
        observer,
      );

      await adapter.send(makeRequest());
      expect(order).toEqual(['observer:start', 'http:call']);
    });
  });

  describe('onRequestSuccess', () => {
    it('should fire with the response and a positive durationMs', async () => {
      let capturedResponse: Response | undefined;
      let capturedDuration: number | undefined;

      const observer: HttpAdapterObserver = {
        onRequestSuccess: (res, durationMs) => {
          capturedResponse = res;
          capturedDuration = durationMs;
        },
      };

      const adapter = HttpAdapter.create(
        [],
        undefined,
        mockClient(async () => ({ data: { ok: true }, status: 200, headers: {} })),
        undefined,
        undefined,
        observer,
      );

      const response = await adapter.send(makeRequest());
      expect(capturedResponse).toBe(response);
      expect(capturedDuration).toBeGreaterThanOrEqual(0);
    });

    it('should not fire when the request fails', async () => {
      const onRequestSuccess = jest.fn();
      const observer: HttpAdapterObserver = { onRequestSuccess };

      const adapter = HttpAdapter.create(
        [],
        undefined,
        mockClient(async () => {
          throw new TimeoutException();
        }),
        undefined,
        undefined,
        observer,
      );

      await expect(adapter.send(makeRequest())).rejects.toThrow();
      expect(onRequestSuccess).not.toHaveBeenCalled();
    });
  });

  describe('onRequestFailure', () => {
    it('should fire with the error and a positive durationMs', async () => {
      let capturedError: BaseAdapterException | undefined;
      let capturedDuration: number | undefined;

      const observer: HttpAdapterObserver = {
        onRequestFailure: (err, durationMs) => {
          capturedError = err;
          capturedDuration = durationMs;
        },
      };

      const adapter = HttpAdapter.create(
        [],
        undefined,
        mockClient(async () => {
          throw new TimeoutException();
        }),
        undefined,
        undefined,
        observer,
      );

      await expect(adapter.send(makeRequest())).rejects.toThrow();
      expect(capturedError).toBeInstanceOf(BaseAdapterException);
      expect(capturedDuration).toBeGreaterThanOrEqual(0);
    });

    it('should not fire when the request succeeds', async () => {
      const onRequestFailure = jest.fn();
      const observer: HttpAdapterObserver = { onRequestFailure };

      const adapter = HttpAdapter.create(
        [],
        undefined,
        mockClient(async () => ({ data: {}, status: 200, headers: {} })),
        undefined,
        undefined,
        observer,
      );

      await adapter.send(makeRequest());
      expect(onRequestFailure).not.toHaveBeenCalled();
    });
  });

  describe('onRetry', () => {
    it('should fire on each retry attempt with attempt number, error, and delay', async () => {
      const retryCalls: Array<{ attempt: number; delay: number }> = [];
      const observer: HttpAdapterObserver = {
        onRetry: (attempt, _error, delayMs) => {
          retryCalls.push({ attempt, delay: delayMs });
        },
      };

      let callCount = 0;
      const adapter = HttpAdapter.create(
        [],
        RetryPolicies.fixedDelay(3, 0),
        mockClient(async () => {
          callCount++;
          if (callCount < 3) throw new TimeoutException();
          return { data: {}, status: 200, headers: {} };
        }),
        undefined,
        undefined,
        observer,
      );

      await adapter.send(makeRequest());
      expect(retryCalls).toHaveLength(2);
      expect(retryCalls[0].attempt).toBe(1);
      expect(retryCalls[1].attempt).toBe(2);
    });

    it('should not fire when no retry policy is set', async () => {
      const onRetry = jest.fn();
      const observer: HttpAdapterObserver = { onRetry };

      const adapter = HttpAdapter.create(
        [],
        undefined,
        mockClient(async () => {
          throw new TimeoutException();
        }),
        undefined,
        undefined,
        observer,
      );

      await expect(adapter.send(makeRequest())).rejects.toThrow();
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('builder integration', () => {
    it('should register observer via withObserver()', async () => {
      const onRequestSuccess = jest.fn();

      const adapter = HttpAdapter.builder()
        .withHttpClient(mockClient(async () => ({ data: {}, status: 200, headers: {} })))
        .withObserver({ onRequestSuccess })
        .build();

      await adapter.send(makeRequest());
      expect(onRequestSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
