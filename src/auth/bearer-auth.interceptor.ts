import { HttpRequestInterceptor } from '../contracts/http-interceptor.contract';
import { Request } from '../models/request';
import { TokenProvider, resolveToken } from './token-provider';

/**
 * An interceptor that attaches a Bearer token to every outgoing request
 * via the `Authorization` header.
 *
 * Accepts either a static token string or a dynamic `TokenProvider` function,
 * making it suitable for both simple API key scenarios and token stores that
 * refresh credentials over time.
 *
 * @example
 * ```typescript
 * // Static token
 * BearerAuthInterceptor.of('my-token')
 *
 * // Dynamic token
 * BearerAuthInterceptor.of(async () => await tokenStore.get())
 * ```
 */
export class BearerAuthInterceptor implements HttpRequestInterceptor {
  private constructor(private readonly provider: TokenProvider) {}

  /**
   * Creates a new `BearerAuthInterceptor` with the given token provider.
   *
   * @param provider - A static token string or a sync/async factory function.
   */
  public static of(provider: TokenProvider): BearerAuthInterceptor {
    return new BearerAuthInterceptor(provider);
  }

  public async onRequest(request: Request): Promise<Request> {
    const token = await resolveToken(this.provider);
    request.addHeader('Authorization', `Bearer ${token}`);
    return request;
  }
}
