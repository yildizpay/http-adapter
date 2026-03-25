import { BearerAuthInterceptor } from '../../src/auth/bearer-auth.interceptor';
import { Request } from '../../src/models/request';
import { HttpMethod } from '../../src/common/enums/http-method.enum';

const makeRequest = () => new Request('https://api.example.com', '/test', HttpMethod.GET);

describe('BearerAuthInterceptor', () => {
  it('should set Authorization header with static token', async () => {
    const interceptor = BearerAuthInterceptor.of('static-token');
    const request = makeRequest();
    await interceptor.onRequest(request);
    expect(request.headers['Authorization']).toBe('Bearer static-token');
  });

  it('should set Authorization header with sync token provider', async () => {
    const interceptor = BearerAuthInterceptor.of(() => 'sync-token');
    const request = makeRequest();
    await interceptor.onRequest(request);
    expect(request.headers['Authorization']).toBe('Bearer sync-token');
  });

  it('should set Authorization header with async token provider', async () => {
    const interceptor = BearerAuthInterceptor.of(async () => 'async-token');
    const request = makeRequest();
    await interceptor.onRequest(request);
    expect(request.headers['Authorization']).toBe('Bearer async-token');
  });

  it('should return the request after setting the header', async () => {
    const interceptor = BearerAuthInterceptor.of('token');
    const request = makeRequest();
    const result = await interceptor.onRequest(request);
    expect(result).toBe(request);
  });

  it('should overwrite an existing Authorization header', async () => {
    const interceptor = BearerAuthInterceptor.of('new-token');
    const request = makeRequest();
    request.addHeader('Authorization', 'Bearer old-token');
    await interceptor.onRequest(request);
    expect(request.headers['Authorization']).toBe('Bearer new-token');
  });
});
