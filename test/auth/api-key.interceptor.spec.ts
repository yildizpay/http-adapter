import { ApiKeyInterceptor } from '../../src/auth/api-key.interceptor';
import { Request } from '../../src/models/request';
import { HttpMethod } from '../../src/common/enums/http-method.enum';

const makeRequest = () => new Request('https://api.example.com', '/test', HttpMethod.GET);

describe('ApiKeyInterceptor', () => {
  describe('header placement', () => {
    it('should add the API key as a request header', async () => {
      const interceptor = ApiKeyInterceptor.of('my-key', { header: 'x-api-key' });
      const request = makeRequest();
      await interceptor.onRequest(request);
      expect(request.headers['x-api-key']).toBe('my-key');
    });

    it('should support a custom header name', async () => {
      const interceptor = ApiKeyInterceptor.of('my-key', { header: 'x-custom-api-key' });
      const request = makeRequest();
      await interceptor.onRequest(request);
      expect(request.headers['x-custom-api-key']).toBe('my-key');
    });

    it('should support a dynamic token provider', async () => {
      const interceptor = ApiKeyInterceptor.of(async () => 'dynamic-key', { header: 'x-api-key' });
      const request = makeRequest();
      await interceptor.onRequest(request);
      expect(request.headers['x-api-key']).toBe('dynamic-key');
    });
  });

  describe('query param placement', () => {
    it('should add the API key as a query parameter', async () => {
      const interceptor = ApiKeyInterceptor.of('my-key', { queryParam: 'api_key' });
      const request = makeRequest();
      await interceptor.onRequest(request);
      expect(request.queryParams['api_key']).toBe('my-key');
    });

    it('should support a custom query param name', async () => {
      const interceptor = ApiKeyInterceptor.of('my-key', { queryParam: 'token' });
      const request = makeRequest();
      await interceptor.onRequest(request);
      expect(request.queryParams['token']).toBe('my-key');
    });

    it('should support a dynamic token provider', async () => {
      const interceptor = ApiKeyInterceptor.of(async () => 'dynamic-key', {
        queryParam: 'api_key',
      });
      const request = makeRequest();
      await interceptor.onRequest(request);
      expect(request.queryParams['api_key']).toBe('dynamic-key');
    });
  });

  it('should return the request after attaching the key', async () => {
    const interceptor = ApiKeyInterceptor.of('key', { header: 'x-api-key' });
    const request = makeRequest();
    const result = await interceptor.onRequest(request);
    expect(result).toBe(request);
  });
});
