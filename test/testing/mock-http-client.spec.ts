import { MockHttpClient } from '../../src/testing/mock-http-client';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { TimeoutException } from '../../src/exceptions/network.exceptions';

const makeConfig = (overrides = {}) => ({
  url: 'https://api.example.com/test',
  method: HttpMethod.POST,
  ...overrides,
});

const makeResponse = (data: unknown = { id: 1 }, status = 200) => ({
  data,
  status,
  headers: {} as Record<string, string>,
});

describe('MockHttpClient', () => {
  let client: MockHttpClient;

  beforeEach(() => {
    client = new MockHttpClient();
  });

  describe('mockResolvedValue', () => {
    it('should return the configured response for every call', async () => {
      const response = makeResponse();
      client.mockResolvedValue(response);

      const result1 = await client.request(makeConfig());
      const result2 = await client.request(makeConfig());

      expect(result1).toBe(response);
      expect(result2).toBe(response);
    });

    it('should return builder instance for chaining', () => {
      expect(client.mockResolvedValue(makeResponse())).toBe(client);
    });
  });

  describe('mockRejectedValue', () => {
    it('should throw the configured error for every call', async () => {
      const error = new TimeoutException();
      client.mockRejectedValue(error);

      await expect(client.request(makeConfig())).rejects.toThrow(TimeoutException);
      await expect(client.request(makeConfig())).rejects.toThrow(TimeoutException);
    });

    it('should return builder instance for chaining', () => {
      expect(client.mockRejectedValue(new TimeoutException())).toBe(client);
    });
  });

  describe('mockResolvedOnce', () => {
    it('should consume one-time responses in FIFO order', async () => {
      const r1 = makeResponse({ id: 1 });
      const r2 = makeResponse({ id: 2 });
      const defaultRes = makeResponse({ id: 99 });

      client.mockResolvedOnce(r1).mockResolvedOnce(r2).mockResolvedValue(defaultRes);

      expect(await client.request(makeConfig())).toBe(r1);
      expect(await client.request(makeConfig())).toBe(r2);
      expect(await client.request(makeConfig())).toBe(defaultRes);
    });

    it('should return builder instance for chaining', () => {
      expect(client.mockResolvedOnce(makeResponse())).toBe(client);
    });
  });

  describe('mockRejectedOnce', () => {
    it('should consume one-time rejections in FIFO order then fall back to default', async () => {
      const error = new TimeoutException();
      client.mockRejectedOnce(error).mockResolvedValue(makeResponse());

      await expect(client.request(makeConfig())).rejects.toThrow(TimeoutException);
      await expect(client.request(makeConfig())).resolves.toBeDefined();
    });

    it('should return builder instance for chaining', () => {
      expect(client.mockRejectedOnce(new TimeoutException())).toBe(client);
    });
  });

  describe('request', () => {
    it('should throw when no response is configured', async () => {
      await expect(client.request(makeConfig())).rejects.toThrow(
        'MockHttpClient: No response configured',
      );
    });

    it('should record every call config', async () => {
      client.mockResolvedValue(makeResponse());

      const config1 = makeConfig({ method: HttpMethod.GET });
      const config2 = makeConfig({ method: HttpMethod.POST });

      await client.request(config1);
      await client.request(config2);

      expect(client.getCalls()).toHaveLength(2);
      expect(client.getCalls()[0]).toBe(config1);
      expect(client.getCalls()[1]).toBe(config2);
    });
  });

  describe('getCalls', () => {
    it('should return a snapshot, not the internal array', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig());

      const calls = client.getCalls();
      calls.push(makeConfig());

      expect(client.getCalls()).toHaveLength(1);
    });
  });

  describe('getCall', () => {
    it('should return the call at the given index', async () => {
      client.mockResolvedValue(makeResponse());
      const config = makeConfig();
      await client.request(config);

      expect(client.getCall(0)).toBe(config);
    });

    it('should throw when index is out of bounds', () => {
      expect(() => client.getCall(0)).toThrow('MockHttpClient: No call at index 0');
    });
  });

  describe('assertCalledTimes', () => {
    it('should not throw when call count matches', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig());
      await client.request(makeConfig());

      expect(() => client.assertCalledTimes(2)).not.toThrow();
    });

    it('should throw when call count does not match', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig());

      expect(() => client.assertCalledTimes(2)).toThrow('Expected 2 call(s), but got 1');
    });
  });

  describe('assertCalledWith', () => {
    it('should not throw when a call matches the expected fields', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig({ method: HttpMethod.POST }));

      expect(() => client.assertCalledWith({ method: HttpMethod.POST })).not.toThrow();
    });

    it('should throw when no call matches', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig({ method: HttpMethod.GET }));

      expect(() => client.assertCalledWith({ method: HttpMethod.POST })).toThrow(
        'MockHttpClient: No call matched',
      );
    });
  });

  describe('assertNotCalled', () => {
    it('should not throw when no calls were made', () => {
      expect(() => client.assertNotCalled()).not.toThrow();
    });

    it('should throw when calls were made', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig());

      expect(() => client.assertNotCalled()).toThrow('Expected no calls, but got 1');
    });
  });

  describe('reset', () => {
    it('should clear all calls, queue and default behavior', async () => {
      client.mockResolvedValue(makeResponse());
      await client.request(makeConfig());

      client.reset();

      expect(client.getCalls()).toHaveLength(0);
      await expect(client.request(makeConfig())).rejects.toThrow('No response configured');
    });
  });
});
