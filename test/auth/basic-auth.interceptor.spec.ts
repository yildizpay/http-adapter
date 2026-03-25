import { BasicAuthInterceptor } from '../../src/auth/basic-auth.interceptor';
import { Request } from '../../src/models/request';
import { HttpMethod } from '../../src/common/enums/http-method.enum';

const makeRequest = () => new Request('https://api.example.com', '/test', HttpMethod.GET);

describe('BasicAuthInterceptor', () => {
  it('should set Authorization header with Base64-encoded credentials', async () => {
    const interceptor = BasicAuthInterceptor.of('admin', 'secret');
    const request = makeRequest();
    await interceptor.onRequest(request);

    const expected = `Basic ${Buffer.from('admin:secret').toString('base64')}`;
    expect(request.headers['Authorization']).toBe(expected);
  });

  it('should handle empty password', async () => {
    const interceptor = BasicAuthInterceptor.of('user', '');
    const request = makeRequest();
    await interceptor.onRequest(request);

    const expected = `Basic ${Buffer.from('user:').toString('base64')}`;
    expect(request.headers['Authorization']).toBe(expected);
  });

  it('should return the request after setting the header', async () => {
    const interceptor = BasicAuthInterceptor.of('user', 'pass');
    const request = makeRequest();
    const result = await interceptor.onRequest(request);
    expect(result).toBe(request);
  });

  it('should overwrite an existing Authorization header', async () => {
    const interceptor = BasicAuthInterceptor.of('new-user', 'new-pass');
    const request = makeRequest();
    request.addHeader('Authorization', 'Basic old-credentials');
    await interceptor.onRequest(request);

    const expected = `Basic ${Buffer.from('new-user:new-pass').toString('base64')}`;
    expect(request.headers['Authorization']).toBe(expected);
  });
});
