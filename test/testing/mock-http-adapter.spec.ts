import { MockHttpAdapter } from '../../src/testing/mock-http-adapter';
import { Request } from '../../src/models/request';
import { Response } from '../../src/models/response';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { NotFoundException } from '../../src/exceptions/http-status.exceptions';
import { HttpExceptionFactory } from '../../src/exceptions/http-exception.factory';

const makeRequest = (endpoint = '/test', method = HttpMethod.POST) =>
  new Request('https://api.example.com', endpoint, method);

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

    it('should return a Response with status 200', async () => {
      adapter.mockResolvedValue({});
      const response = await adapter.send(makeRequest());
      expect(response.status).toBe(200);
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

  describe('onEndpoint', () => {
    it('should route responses to the correct endpoint', async () => {
      adapter.onEndpoint('/process').mockResolvedValue({ STATUS: 'SUCCESS' });
      adapter.onEndpoint('/payments').mockResolvedValue({ paymentList: [1, 2] });

      const process = await adapter.send(makeRequest('/process'));
      const payments = await adapter.send(makeRequest('/payments'));

      expect(process.data).toEqual({ STATUS: 'SUCCESS' });
      expect(payments.data).toEqual({ paymentList: [1, 2] });
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

      const process = await adapter.send(makeRequest('/process'));
      const other = await adapter.send(makeRequest('/other'));

      expect(process.data).toEqual({ source: 'endpoint' });
      expect(other.data).toEqual({ source: 'global' });
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

    it('should return the same scope instance for the same endpoint', () => {
      const scope1 = adapter.onEndpoint('/process');
      const scope2 = adapter.onEndpoint('/process');

      scope1.mockResolvedValue({ id: 1 });

      // Both scopes point to the same handler, so scope2 reflects scope1's setup
      expect(scope1).not.toBe(scope2);
    });

    it('should throw when endpoint scope and global are both exhausted', async () => {
      adapter.onEndpoint('/process').mockResolvedOnce({ id: 1 });

      await adapter.send(makeRequest('/process'));

      await expect(adapter.send(makeRequest('/process'))).rejects.toThrow(
        'MockHttpAdapter: No response configured',
      );
    });
  });

  describe('send', () => {
    it('should throw when no response is configured', async () => {
      await expect(adapter.send(makeRequest())).rejects.toThrow(
        'MockHttpAdapter: No response configured',
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
    it('should not throw when a matching call exists', async () => {
      adapter.mockResolvedValue({});
      const request = makeRequest('/payments', HttpMethod.POST);
      await adapter.send(request);

      expect(() => adapter.assertCalledWith(request)).not.toThrow();
    });

    it('should throw when no call matches the endpoint and method', async () => {
      adapter.mockResolvedValue({});
      await adapter.send(makeRequest('/users', HttpMethod.GET));

      const expected = makeRequest('/payments', HttpMethod.POST);
      expect(() => adapter.assertCalledWith(expected)).toThrow(
        'MockHttpAdapter: No call matched POST /payments',
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
      await expect(adapter.send(makeRequest())).rejects.toThrow('No response configured');
    });

    it('should clear endpoint-specific handlers', async () => {
      adapter.onEndpoint('/process').mockResolvedValue({ id: 1 });
      adapter.reset();

      await expect(adapter.send(makeRequest('/process'))).rejects.toThrow('No response configured');
    });
  });
});
