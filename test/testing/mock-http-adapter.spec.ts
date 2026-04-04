import { MockHttpAdapter } from '../../src/testing/mock-http-adapter';
import { Request } from '../../src/models/request';
import { Response } from '../../src/models/response';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { HttpBody } from '../../src/common/types/http.types';
import { NotFoundException } from '../../src/exceptions/http-status.exceptions';
import { HttpExceptionFactory } from '../../src/exceptions/http-exception.factory';

const makeRequest = (endpoint = '/test', method = HttpMethod.POST) =>
  new Request('https://api.example.com', endpoint, method);

const makeRequestWithBody = (endpoint: string, body: HttpBody) =>
  new Request('https://api.example.com', endpoint, HttpMethod.POST, {}, {}, body);

describe('MockHttpAdapter', () => {
  let adapter: MockHttpAdapter;

  beforeEach(() => {
    adapter = new MockHttpAdapter();
  });

  describe('mockResolvedValue', () => {
    it('should return a Response wrapping the configured data for every call', async () => {
      adapter.mockResolvedValue({ id: 1 });

      const r1 = await adapter.send(makeRequest());
      const r2 = await adapter.send(makeRequest());

      expect(r1).toBeInstanceOf(Response);
      expect(r1.data).toEqual({ id: 1 });
      expect(r2.data).toEqual({ id: 1 });
    });

    it('should default to status 200 when no status is provided', async () => {
      adapter.mockResolvedValue({});
      const response = await adapter.send(makeRequest());
      expect(response.status).toBe(200);
    });

    it('should use the configured status code', async () => {
      adapter.mockResolvedValue({}, 201);
      const response = await adapter.send(makeRequest());
      expect(response.status).toBe(201);
    });

    it('should return builder instance for chaining', () => {
      expect(adapter.mockResolvedValue({})).toBe(adapter);
    });
  });

  describe('mockRejectedValue', () => {
    it('should throw the configured error for every call', async () => {
      const error = new NotFoundException(
        HttpExceptionFactory.createFromResponse(404).response,
        'Not found',
      );
      adapter.mockRejectedValue(error);

      await expect(adapter.send(makeRequest())).rejects.toThrow(NotFoundException);
      await expect(adapter.send(makeRequest())).rejects.toThrow(NotFoundException);
    });

    it('should return builder instance for chaining', () => {
      expect(adapter.mockRejectedValue(new Error('test error'))).toBe(adapter);
    });
  });

  describe('mockResolvedOnce', () => {
    it('should consume one-time responses in FIFO order then fall back to default', async () => {
      adapter.mockResolvedOnce({ id: 1 }).mockResolvedOnce({ id: 2 }).mockResolvedValue({ id: 99 });

      expect((await adapter.send(makeRequest())).data).toEqual({ id: 1 });
      expect((await adapter.send(makeRequest())).data).toEqual({ id: 2 });
      expect((await adapter.send(makeRequest())).data).toEqual({ id: 99 });
    });

    it('should use the configured status code', async () => {
      adapter.mockResolvedOnce({}, 201);
      const response = await adapter.send(makeRequest());
      expect(response.status).toBe(201);
    });

    it('should return builder instance for chaining', () => {
      expect(adapter.mockResolvedOnce({})).toBe(adapter);
    });
  });

  describe('mockRejectedOnce', () => {
    it('should consume one-time rejection then fall back to default', async () => {
      adapter.mockRejectedOnce(new Error('once')).mockResolvedValue({ id: 1 });

      await expect(adapter.send(makeRequest())).rejects.toThrow('once');
      await expect(adapter.send(makeRequest())).resolves.toBeDefined();
    });

    it('should return builder instance for chaining', () => {
      expect(adapter.mockRejectedOnce(new Error('test error'))).toBe(adapter);
    });
  });

  describe('mockImplementation', () => {
    it('should return data produced by the function for every call', async () => {
      adapter.mockImplementation((req) => ({ endpoint: req.endpoint }));

      const r1 = await adapter.send(makeRequest('/a'));
      const r2 = await adapter.send(makeRequest('/b'));

      expect(r1.data).toEqual({ endpoint: '/a' });
      expect(r2.data).toEqual({ endpoint: '/b' });
    });

    it('should support async implementation functions', async () => {
      adapter.mockImplementation(async () => ({ ok: true }));

      const response = await adapter.send(makeRequest());
      expect(response.data).toEqual({ ok: true });
    });

    it('should default to status 200 for implementation responses', async () => {
      adapter.mockImplementation(() => ({}));
      const response = await adapter.send(makeRequest());
      expect(response.status).toBe(200);
    });

    it('should use the configured status code', async () => {
      adapter.mockImplementation(() => ({}), 201);
      const response = await adapter.send(makeRequest());
      expect(response.status).toBe(201);
    });

    it('should return builder instance for chaining', () => {
      expect(adapter.mockImplementation(() => ({}))).toBe(adapter);
    });
  });

  describe('mockImplementationOnce', () => {
    it('should consume one-time implementation in FIFO order then fall back to default', async () => {
      adapter
        .mockImplementationOnce((req) => ({ source: 'once', endpoint: req.endpoint }))
        .mockResolvedValue({ source: 'default' });

      expect((await adapter.send(makeRequest('/a'))).data).toEqual({
        source: 'once',
        endpoint: '/a',
      });
      expect((await adapter.send(makeRequest())).data).toEqual({ source: 'default' });
    });

    it('should return builder instance for chaining', () => {
      expect(adapter.mockImplementationOnce(() => ({}))).toBe(adapter);
    });
  });

  describe('strict mode', () => {
    beforeEach(() => {
      adapter = new MockHttpAdapter({ strict: true });
    });

    it('should throw for unregistered endpoints even when a global default is configured', async () => {
      adapter.mockResolvedValue({ ok: true });

      await expect(adapter.send(makeRequest('/unregistered'))).rejects.toThrow(
        'Strict mode is enabled. Unexpected call to "/unregistered"',
      );
    });

    it('should not throw for endpoints registered via onEndpoint()', async () => {
      adapter.onEndpoint('/registered').mockResolvedValue({ ok: true });

      await expect(adapter.send(makeRequest('/registered'))).resolves.toBeDefined();
    });

    it('should not record the call when strict mode throws', async () => {
      try {
        await adapter.send(makeRequest('/unregistered'));
      } catch {
        // expected
      }
      expect(adapter.callCount).toBe(0);
    });
  });

  describe('onEndpoint', () => {
    describe('response mocking', () => {
      it('should route responses to the correct endpoint', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({ STATUS: 'SUCCESS' });
        adapter.onEndpoint('/payments').mockResolvedValue({ paymentList: [1, 2] });

        const process = await adapter.send(makeRequest('/process'));
        const payments = await adapter.send(makeRequest('/payments'));

        expect(process.data).toEqual({ STATUS: 'SUCCESS' });
        expect(payments.data).toEqual({ paymentList: [1, 2] });
      });

      it('should use the configured status code', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({}, 201);
        const response = await adapter.send(makeRequest('/process'));
        expect(response.status).toBe(201);
      });

      it('should consume endpoint one-time queue in FIFO order then fall back to endpoint default', async () => {
        adapter
          .onEndpoint('/process')
          .mockResolvedOnce({ attempt: 1 })
          .mockResolvedOnce({ attempt: 2 })
          .mockResolvedValue({ attempt: 'default' });

        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ attempt: 1 });
        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ attempt: 2 });
        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ attempt: 'default' });
      });

      it('should fall back to global queue when endpoint scope is exhausted', async () => {
        adapter.onEndpoint('/process').mockResolvedOnce({ source: 'endpoint' });
        adapter.mockResolvedValue({ source: 'global' });

        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ source: 'endpoint' });
        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ source: 'global' });
      });

      it('should fall back to global default for unregistered endpoints', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({ source: 'endpoint' });
        adapter.mockResolvedValue({ source: 'global' });

        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ source: 'endpoint' });
        expect((await adapter.send(makeRequest('/other'))).data).toEqual({ source: 'global' });
      });

      it('should support endpoint-specific rejection', async () => {
        adapter.onEndpoint('/process').mockRejectedValue(new Error('endpoint error'));
        adapter.mockResolvedValue({ source: 'global' });

        await expect(adapter.send(makeRequest('/process'))).rejects.toThrow('endpoint error');
        await expect(adapter.send(makeRequest('/other'))).resolves.toBeDefined();
      });

      it('should support endpoint-specific one-time rejection then fall back', async () => {
        adapter
          .onEndpoint('/process')
          .mockRejectedOnce(new Error('once'))
          .mockResolvedValue({ ok: true });

        await expect(adapter.send(makeRequest('/process'))).rejects.toThrow('once');
        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ ok: true });
      });

      it('should throw when endpoint scope and global are both exhausted', async () => {
        adapter.onEndpoint('/process').mockResolvedOnce({ id: 1 });

        await adapter.send(makeRequest('/process'));

        await expect(adapter.send(makeRequest('/process'))).rejects.toThrow(
          'MockHttpAdapter: No response configured',
        );
      });

      it('should support endpoint-specific mockImplementation', async () => {
        adapter.onEndpoint('/process').mockImplementation((req) => ({ path: req.endpoint }));

        const response = await adapter.send(makeRequest('/process'));
        expect(response.data).toEqual({ path: '/process' });
      });

      it('should support endpoint-specific mockImplementationOnce then fall back', async () => {
        adapter
          .onEndpoint('/process')
          .mockImplementationOnce(() => ({ source: 'once' }))
          .mockResolvedValue({ source: 'default' });

        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ source: 'once' });
        expect((await adapter.send(makeRequest('/process'))).data).toEqual({ source: 'default' });
      });
    });

    describe('call tracking', () => {
      it('should track calls made to the endpoint', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        const r1 = makeRequest('/process');
        const r2 = makeRequest('/process');

        await adapter.send(r1);
        await adapter.send(r2);

        const scope = adapter.onEndpoint('/process');
        expect(scope.getCalls()).toHaveLength(2);
        expect(scope.getCalls()[0]).toBe(r1);
        expect(scope.getCalls()[1]).toBe(r2);
      });

      it('should not include calls made to other endpoints', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        adapter.onEndpoint('/payments').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));
        await adapter.send(makeRequest('/process'));
        await adapter.send(makeRequest('/payments'));

        expect(adapter.onEndpoint('/process').callCount).toBe(2);
        expect(adapter.onEndpoint('/payments').callCount).toBe(1);
      });

      it('callCount should return the number of calls to the endpoint', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));
        await adapter.send(makeRequest('/process'));

        expect(adapter.onEndpoint('/process').callCount).toBe(2);
      });

      it('firstCall should return the first request to the endpoint', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        const first = makeRequest('/process');
        await adapter.send(first);
        await adapter.send(makeRequest('/process'));

        expect(adapter.onEndpoint('/process').firstCall).toBe(first);
      });

      it('lastCall should return the most recent request to the endpoint', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));
        const last = makeRequest('/process');
        await adapter.send(last);

        expect(adapter.onEndpoint('/process').lastCall).toBe(last);
      });

      it('firstCall and lastCall should be undefined when no calls were made', () => {
        expect(adapter.onEndpoint('/process').firstCall).toBeUndefined();
        expect(adapter.onEndpoint('/process').lastCall).toBeUndefined();
      });

      it('wasCalled should return true after at least one call', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        expect(adapter.onEndpoint('/process').wasCalled()).toBe(true);
      });

      it('wasCalled should return false when no calls were made', () => {
        expect(adapter.onEndpoint('/process').wasCalled()).toBe(false);
      });

      it('wasNotCalled should return true when no calls were made', () => {
        expect(adapter.onEndpoint('/process').wasNotCalled()).toBe(true);
      });

      it('wasNotCalled should return false after at least one call', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        expect(adapter.onEndpoint('/process').wasNotCalled()).toBe(false);
      });

      it('getCall should return the request at the given index', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        const request = makeRequest('/process');
        await adapter.send(request);

        expect(adapter.onEndpoint('/process').getCall(0)).toBe(request);
      });

      it('getCall should throw when index is out of bounds', async () => {
        expect(() => adapter.onEndpoint('/process').getCall(0)).toThrow(
          'MockHttpAdapter: No call at index 0 for endpoint "/process"',
        );
      });

      it('getCalls should return a snapshot, not the internal array', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        const scope = adapter.onEndpoint('/process');
        const calls = scope.getCalls();
        calls.push(makeRequest('/process'));

        expect(scope.getCalls()).toHaveLength(1);
      });
    });

    describe('assertions', () => {
      it('assertCalledTimes should not throw when count matches', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));
        await adapter.send(makeRequest('/process'));

        expect(() => adapter.onEndpoint('/process').assertCalledTimes(2)).not.toThrow();
      });

      it('assertCalledTimes should throw when count does not match', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        expect(() => adapter.onEndpoint('/process').assertCalledTimes(2)).toThrow(
          'Expected "/process" to be called 2 time(s), but got 1',
        );
      });

      it('assertCalledWith should not throw when called with no matchers', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        expect(() => adapter.onEndpoint('/process').assertCalledWith()).not.toThrow();
      });

      it('assertCalledWith should include "(no calls)" in error when endpoint has no calls', () => {
        expect(() => adapter.onEndpoint('/process').assertCalledWith()).toThrow('(no calls)');
      });

      it('assertCalledWith should not throw when matchers match', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequestWithBody('/process', { AMOUNT: '100' }));

        expect(() =>
          adapter.onEndpoint('/process').assertCalledWith({ body: { AMOUNT: '100' } }),
        ).not.toThrow();
      });

      it('assertCalledWith should throw when no call matches the matchers', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequestWithBody('/process', { AMOUNT: '100' }));

        expect(() =>
          adapter.onEndpoint('/process').assertCalledWith({ body: { AMOUNT: '200' } }),
        ).toThrow('No call to "/process" matched the given matchers');
      });

      it('assertNotCalled should not throw when no calls were made', () => {
        expect(() => adapter.onEndpoint('/process').assertNotCalled()).not.toThrow();
      });

      it('assertNotCalled should throw when calls were made', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        expect(() => adapter.onEndpoint('/process').assertNotCalled()).toThrow(
          'Expected "/process" to not be called, but got 1 call(s)',
        );
      });
    });

    describe('reset', () => {
      it('should clear calls, queue and default behavior for that endpoint only', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({});
        await adapter.send(makeRequest('/process'));

        adapter.onEndpoint('/process').reset();

        expect(adapter.onEndpoint('/process').callCount).toBe(0);
        await expect(adapter.send(makeRequest('/process'))).rejects.toThrow(
          'No response configured',
        );
      });

      it('should not affect other endpoints', async () => {
        adapter.onEndpoint('/process').mockResolvedValue({ id: 1 });
        adapter.onEndpoint('/payments').mockResolvedValue({ id: 2 });
        await adapter.send(makeRequest('/process'));

        adapter.onEndpoint('/process').reset();

        expect(adapter.onEndpoint('/payments').callCount).toBe(0);
        await expect(adapter.send(makeRequest('/payments'))).resolves.toBeDefined();
      });
    });
  });

  describe('send', () => {
    it('should throw when no response is configured with endpoint name in message', async () => {
      await expect(adapter.send(makeRequest('/api/pay'))).rejects.toThrow(
        'No response configured for "/api/pay"',
      );
    });

    it('should record every request', async () => {
      adapter.mockResolvedValue({});
      const r1 = makeRequest('/users');
      const r2 = makeRequest('/payments');

      await adapter.send(r1);
      await adapter.send(r2);

      expect(adapter.getCalls()).toHaveLength(2);
      expect(adapter.getCalls()[0]).toBe(r1);
      expect(adapter.getCalls()[1]).toBe(r2);
    });
  });

  describe('getCalls', () => {
    it('should return a snapshot, not the internal array', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      const calls = adapter.getCalls();
      calls.push(makeRequest());

      expect(adapter.getCalls()).toHaveLength(1);
    });
  });

  describe('getCall', () => {
    it('should return the request at the given index', async () => {
      adapter.mockResolvedValue({});
      const request = makeRequest();
      await adapter.send(request);

      expect(adapter.getCall(0)).toBe(request);
    });

    it('should throw when index is out of bounds', () => {
      expect(() => adapter.getCall(0)).toThrow('MockHttpAdapter: No call at index 0');
    });
  });

  describe('convenience getters', () => {
    it('callCount should return the total number of calls', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());
      await adapter.send(makeRequest());

      expect(adapter.callCount).toBe(2);
    });

    it('firstCall should return the first recorded request', async () => {
      adapter.mockResolvedValue({});
      const first = makeRequest('/first');
      await adapter.send(first);
      await adapter.send(makeRequest('/second'));

      expect(adapter.firstCall).toBe(first);
    });

    it('lastCall should return the most recent recorded request', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/first'));
      const last = makeRequest('/last');
      await adapter.send(last);

      expect(adapter.lastCall).toBe(last);
    });

    it('firstCall and lastCall should be undefined when no calls were made', () => {
      expect(adapter.firstCall).toBeUndefined();
      expect(adapter.lastCall).toBeUndefined();
    });

    it('wasCalled should return true after at least one call', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      expect(adapter.wasCalled()).toBe(true);
    });

    it('wasCalled should return false when no calls were made', () => {
      expect(adapter.wasCalled()).toBe(false);
    });

    it('wasNotCalled should return true when no calls were made', () => {
      expect(adapter.wasNotCalled()).toBe(true);
    });

    it('wasNotCalled should return false after at least one call', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      expect(adapter.wasNotCalled()).toBe(false);
    });
  });

  describe('assertCalledTimes', () => {
    it('should not throw when call count matches', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());
      await adapter.send(makeRequest());

      expect(() => adapter.assertCalledTimes(2)).not.toThrow();
    });

    it('should throw when call count does not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      expect(() => adapter.assertCalledTimes(2)).toThrow('Expected 2 call(s), but got 1');
    });
  });

  describe('assertCalledWith', () => {
    it('should not throw when endpoint matches', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.POST));

      expect(() => adapter.assertCalledWith('/payments')).not.toThrow();
    });

    it('should not throw when endpoint and method match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.POST));

      expect(() =>
        adapter.assertCalledWith('/payments', { method: HttpMethod.POST }),
      ).not.toThrow();
    });

    it('should not throw when partial body matches', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { AMOUNT: '100', CURRENCY: 'TRY' }));

      expect(() =>
        adapter.assertCalledWith('/payments', { body: { AMOUNT: '100' } }),
      ).not.toThrow();
    });

    it('should not throw when partial headers match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(
        new Request('https://api.example.com', '/payments', HttpMethod.POST, {
          'X-Merchant': 'M001',
          'Content-Type': 'application/json',
        }),
      );

      expect(() =>
        adapter.assertCalledWith('/payments', { headers: { 'X-Merchant': 'M001' } }),
      ).not.toThrow();
    });

    it('should not throw when partial queryParams match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(
        new Request(
          'https://api.example.com',
          '/payments',
          HttpMethod.GET,
          {},
          { page: '1', size: '10' },
        ),
      );

      expect(() =>
        adapter.assertCalledWith('/payments', { queryParams: { page: '1' } }),
      ).not.toThrow();
    });

    it('should throw when no call matches the endpoint', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/users', HttpMethod.GET));

      expect(() => adapter.assertCalledWith('/payments')).toThrow(
        'MockHttpAdapter: No call matched endpoint "/payments"',
      );
    });

    it('should throw when method does not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.GET));

      expect(() => adapter.assertCalledWith('/payments', { method: HttpMethod.POST })).toThrow(
        'No call matched endpoint "/payments"',
      );
    });

    it('should throw when body does not contain expected keys', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { AMOUNT: '100' }));

      expect(() => adapter.assertCalledWith('/payments', { body: { CURRENCY: 'TRY' } })).toThrow(
        'No call matched endpoint "/payments"',
      );
    });

    it('should throw when body matcher is provided but call has no body', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments'));

      expect(() => adapter.assertCalledWith('/payments', { body: { AMOUNT: '100' } })).toThrow(
        'No call matched endpoint "/payments"',
      );
    });

    it('should throw when headers do not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(
        new Request('https://api.example.com', '/payments', HttpMethod.POST, {
          'X-Merchant': 'M001',
        }),
      );

      expect(() =>
        adapter.assertCalledWith('/payments', { headers: { 'X-Merchant': 'WRONG' } }),
      ).toThrow('No call matched endpoint "/payments"');
    });

    it('should throw when queryParams do not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(
        new Request('https://api.example.com', '/payments', HttpMethod.GET, {}, { page: '1' }),
      );

      expect(() => adapter.assertCalledWith('/payments', { queryParams: { page: '2' } })).toThrow(
        'No call matched endpoint "/payments"',
      );
    });

    it('should not include "Matchers: undefined" in error when no matchers are given', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/a'));

      let errorMessage = '';
      try {
        adapter.assertCalledWith('/b');
      } catch (e) {
        errorMessage = (e as Error).message;
      }

      expect(errorMessage).not.toContain('Matchers: undefined');
    });

    it('should support nested body matching via deep partial equality', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { data: { AMOUNT: '100', EXTRA: 'x' } }));

      expect(() =>
        adapter.assertCalledWith('/payments', { body: { data: { AMOUNT: '100' } } }),
      ).not.toThrow();
    });

    it('should correctly distinguish null from undefined in body matching', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { AMOUNT: null }));

      // null !== undefined — should not match undefined expectation
      expect(() => adapter.assertCalledWith('/payments', { body: { AMOUNT: undefined } })).toThrow(
        'No call matched endpoint "/payments"',
      );
    });

    it('should not confuse {} with []', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { AMOUNT: '100' }));

      // An array expected should not match a plain object body
      expect(() =>
        adapter.assertCalledWith('/payments', { body: [] as unknown as HttpBody }),
      ).toThrow('No call matched endpoint "/payments"');
    });

    it('should not match when expected is a Date but actual is a plain string', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { createdAt: '2024-01-01' }));

      // expected is a Date, actual is a string — should not match
      expect(() =>
        adapter.assertCalledWith('/payments', {
          body: { createdAt: new Date('2024-01-01') } as unknown as HttpBody,
        }),
      ).toThrow('No call matched endpoint "/payments"');
    });

    it('should not match when both are Dates but with different times', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(
        makeRequestWithBody('/payments', {
          createdAt: new Date('2024-01-01'),
        } as unknown as HttpBody),
      );

      // both are Dates but times differ — should not match
      expect(() =>
        adapter.assertCalledWith('/payments', {
          body: { createdAt: new Date('2024-06-01') } as unknown as HttpBody,
        }),
      ).toThrow('No call matched endpoint "/payments"');
    });

    it('should not match when a nested value is an array but expected is a plain object', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { data: { AMOUNT: '100' } }));

      // expected.data is [] but actual.data is {} — deep mismatch
      expect(() =>
        adapter.assertCalledWith('/payments', {
          body: { data: [] } as unknown as HttpBody,
        }),
      ).toThrow('No call matched endpoint "/payments"');
    });
  });

  describe('assertCalledWithBody', () => {
    it('should not throw when body contains expected keys', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { AMOUNT: '100', CURRENCY: 'TRY' }));

      expect(() => adapter.assertCalledWithBody(0, { AMOUNT: '100' })).not.toThrow();
    });

    it('should support deep equality for nested body values', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { data: { AMOUNT: '100' } }));

      expect(() => adapter.assertCalledWithBody(0, { data: { AMOUNT: '100' } })).not.toThrow();
    });

    it('should throw when body does not contain expected keys', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequestWithBody('/payments', { AMOUNT: '100' }));

      expect(() => adapter.assertCalledWithBody(0, { CURRENCY: 'TRY' })).toThrow(
        'Call at index 0 body did not match',
      );
    });

    it('should throw when call has no body', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments'));

      expect(() => adapter.assertCalledWithBody(0, { AMOUNT: '100' })).toThrow(
        'Call at index 0 has no body',
      );
    });
  });

  describe('assertNthCalledWith', () => {
    it('should not throw when the nth call matches (1-based)', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/first'));
      await adapter.send(makeRequest('/second'));

      expect(() => adapter.assertNthCalledWith(2, '/second')).not.toThrow();
    });

    it('should support matchers for the nth call', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.GET));
      await adapter.send(makeRequest('/payments', HttpMethod.POST));

      expect(() =>
        adapter.assertNthCalledWith(2, '/payments', { method: HttpMethod.POST }),
      ).not.toThrow();
    });

    it('should throw when the nth call does not exist', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      expect(() => adapter.assertNthCalledWith(3, '/test')).toThrow(
        'Expected call #3 but only 1 call(s) were made',
      );
    });

    it('should throw when the nth call does not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/first'));

      expect(() => adapter.assertNthCalledWith(1, '/second')).toThrow('Call #1 did not match');
    });

    it('should include matchers in the error message when nth call does not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.GET));

      expect(() =>
        adapter.assertNthCalledWith(1, '/payments', { method: HttpMethod.POST }),
      ).toThrow(JSON.stringify({ method: HttpMethod.POST }));
    });
  });

  describe('assertLastCalledWith', () => {
    it('should not throw when the last call matches', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/first'));
      await adapter.send(makeRequest('/last'));

      expect(() => adapter.assertLastCalledWith('/last')).not.toThrow();
    });

    it('should support matchers for the last call', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.POST));

      expect(() =>
        adapter.assertLastCalledWith('/payments', { method: HttpMethod.POST }),
      ).not.toThrow();
    });

    it('should throw when no calls were made', () => {
      expect(() => adapter.assertLastCalledWith('/payments')).toThrow(
        'MockHttpAdapter: No calls were made',
      );
    });

    it('should throw when the last call does not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/first'));

      expect(() => adapter.assertLastCalledWith('/second')).toThrow(
        'MockHttpAdapter: Last call did not match',
      );
    });

    it('should include matchers in the error message when last call does not match', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments', HttpMethod.GET));

      expect(() => adapter.assertLastCalledWith('/payments', { method: HttpMethod.POST })).toThrow(
        JSON.stringify({ method: HttpMethod.POST }),
      );
    });
  });

  describe('assertCallOrder', () => {
    it('should not throw when endpoints appear in the expected order', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/auth'));
      await adapter.send(makeRequest('/payments'));

      expect(() => adapter.assertCallOrder(['/auth', '/payments'])).not.toThrow();
    });

    it('should allow other calls interleaved between expected ones', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/auth'));
      await adapter.send(makeRequest('/token'));
      await adapter.send(makeRequest('/payments'));

      expect(() => adapter.assertCallOrder(['/auth', '/payments'])).not.toThrow();
    });

    it('should throw when an endpoint is missing from the calls', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/auth'));

      expect(() => adapter.assertCallOrder(['/auth', '/payments'])).toThrow(
        'Expected "/payments" to be called after "/auth"',
      );
    });

    it('should throw when the order is reversed', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/payments'));
      await adapter.send(makeRequest('/auth'));

      expect(() => adapter.assertCallOrder(['/auth', '/payments'])).toThrow(
        'Expected "/payments" to be called after "/auth"',
      );
    });

    it('should throw when no calls were made', () => {
      expect(() => adapter.assertCallOrder(['/auth'])).toThrow(
        'Expected "/auth" to be called as the first call',
      );
    });
  });

  describe('assertNotCalled', () => {
    it('should not throw when no calls were made', () => {
      expect(() => adapter.assertNotCalled()).not.toThrow();
    });

    it('should throw when calls were made', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      expect(() => adapter.assertNotCalled()).toThrow('Expected no calls, but got 1');
    });
  });

  describe('reset', () => {
    it('should clear all calls, queue and default behavior', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest());

      adapter.reset();

      expect(adapter.getCalls()).toHaveLength(0);
      expect(adapter.callCount).toBe(0);
      await expect(adapter.send(makeRequest())).rejects.toThrow('No response configured');
    });

    it('should clear endpoint-specific handlers in-place', async () => {
      adapter.onEndpoint('/process').mockResolvedValue({ id: 1 });
      adapter.reset();

      await expect(adapter.send(makeRequest('/process'))).rejects.toThrow('No response configured');
    });

    it('should keep existing scope instances valid after reset (no stale scope bug)', async () => {
      const scope = adapter.onEndpoint('/process');
      scope.mockResolvedValue({ ok: true });

      await adapter.send(makeRequest('/process'));

      adapter.reset();

      // Re-configure via the existing scope instance
      scope.mockResolvedValue({ ok: true });
      await adapter.send(makeRequest('/process'));

      // After reset the call count was zeroed in-place — scope sees only the post-reset call
      scope.assertCalledTimes(1);
      expect(scope.callCount).toBe(1);
    });

    it('should clear calls recorded by endpoint scopes', async () => {
      const scope = adapter.onEndpoint('/process');
      scope.mockResolvedValue({});
      await adapter.send(makeRequest('/process'));
      expect(scope.callCount).toBe(1);

      adapter.reset();

      expect(scope.callCount).toBe(0);
      expect(scope.wasCalled()).toBe(false);
    });
  });
});
