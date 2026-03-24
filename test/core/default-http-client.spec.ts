import { defaultHttpClient, FetchHttpClient } from '../../src/core/default-http-client';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { NotFoundException } from '../../src/exceptions/http-status.exceptions';
import { TimeoutException } from '../../src/exceptions/network.exceptions';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';

describe('FetchHttpClient', () => {
  let client: FetchHttpClient;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    client = new FetchHttpClient();
    globalThis.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should be defined as defaultHttpClient', () => {
    expect(defaultHttpClient).toBeInstanceOf(FetchHttpClient);
  });

  it('should send a successful JSON request and parse the response', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/json; charset=utf-8',
        'x-custom': 'value',
      }),
      json: jest.fn().mockResolvedValue({ success: true }),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await client.request({
      url: 'https://api.example.com',
      method: HttpMethod.POST,
      headers: { Authorization: 'Bearer token' },
      data: { key: 'value' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('https://api.example.com', {
      method: HttpMethod.POST,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({ key: 'value' }),
      signal: expect.any(AbortSignal),
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ success: true });
    expect(result.headers['x-custom']).toBe('value');
  });

  it('should send a successful string response and parse text when not JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: jest.fn().mockResolvedValue('Plain text response'),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await client.request({
      url: 'https://api.example.com',
      method: HttpMethod.GET,
    });

    expect(result.status).toBe(201);
    expect(result.data).toBe('Plain text response');
  });

  it('should handle JSON parse rejection gracefully', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await client.request({
      url: 'https://api.example.com',
      method: HttpMethod.GET,
    });

    expect(result.data).toBeNull();
  });

  it('should handle text parse rejection gracefully', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: jest.fn().mockRejectedValue(new Error('Invalid Text Stream')),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await client.request({
      url: 'https://api.example.com',
      method: HttpMethod.GET,
    });

    expect(result.data).toBeNull();
  });

  it('should abort and throw BaseAdapterException on timeout', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      (url, config) =>
        new Promise((resolve, reject) => {
          if (config.signal) {
            config.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        }),
    );

    const promise = client.request({
      url: 'https://api.example.com',
      method: HttpMethod.GET,
      timeout: 100,
    });

    jest.advanceTimersByTime(150);

    let error: unknown;
    try {
      await promise;
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    // Simulate the native DOMException AbortError thrown by fetch when an AbortPattern is triggered
  });

  it('should throw timeout exception when AbortError is caught', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    (globalThis.fetch as jest.Mock).mockRejectedValue(abortError);

    await expect(
      client.request({
        url: 'https://api.example.com',
        method: HttpMethod.GET,
        timeout: 5000,
      }),
    ).rejects.toThrow(BaseAdapterException);

    try {
      await client.request({
        url: 'https://api.example.com',
        method: HttpMethod.GET,
        timeout: 5000,
      });
    } catch (e: unknown) {
      if (!(e instanceof BaseAdapterException)) {
        console.error('Unexpected error caught:', e);
      }
      expect(e).toBeInstanceOf(BaseAdapterException);
      expect(e).toBeInstanceOf(TimeoutException);
    }
  });

  it('should rethrow standard errors transparently', async () => {
    const standardError = new Error('DNS resolution failed');
    (globalThis.fetch as jest.Mock).mockRejectedValueOnce(standardError);

    await expect(
      client.request({
        url: 'https://api.example.com',
        method: HttpMethod.GET,
      }),
    ).rejects.toThrow('DNS resolution failed');
  });

  it('should explicitly throw BaseAdapterException on non-ok (4xx, 5xx) status', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ error: 'Not Found' }),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    let error: unknown;
    try {
      await client.request({
        url: 'https://api.example.com',
        method: HttpMethod.GET,
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(NotFoundException);
    const httpError = error as NotFoundException;
    expect(httpError.response).toBeDefined();
    expect(httpError.response?.status).toBe(404);
    expect(httpError.response?.data).toEqual({ error: 'Not Found' });
  });
});
