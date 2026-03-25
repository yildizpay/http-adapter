import { HttpRequestInterceptor } from '../contracts/http-interceptor.contract';
import { Request } from '../models/request';
import { TokenProvider, resolveToken } from './token-provider';

/**
 * Configuration for `ApiKeyInterceptor`.
 *
 * Exactly one of `header` or `queryParam` must be provided.
 */
export type ApiKeyPlacement =
  | { header: string; queryParam?: never }
  | { queryParam: string; header?: never };

/**
 * An interceptor that attaches an API key to every outgoing request,
 * either as a request header or as a query parameter.
 *
 * Accepts either a static key string or a dynamic `TokenProvider` function.
 *
 * @example
 * ```typescript
 * // As a header
 * ApiKeyInterceptor.of('my-key', { header: 'x-api-key' })
 *
 * // As a query parameter
 * ApiKeyInterceptor.of('my-key', { queryParam: 'api_key' })
 * ```
 */
export class ApiKeyInterceptor implements HttpRequestInterceptor {
  private constructor(
    private readonly provider: TokenProvider,
    private readonly placement: ApiKeyPlacement,
  ) {}

  /**
   * Creates a new `ApiKeyInterceptor` with the given key and placement strategy.
   *
   * @param provider - A static key string or a sync/async factory function.
   * @param placement - Where to attach the key: `{ header: '...' }` or `{ queryParam: '...' }`.
   */
  public static of(provider: TokenProvider, placement: ApiKeyPlacement): ApiKeyInterceptor {
    return new ApiKeyInterceptor(provider, placement);
  }

  public async onRequest(request: Request): Promise<Request> {
    const key = await resolveToken(this.provider);

    const { header, queryParam } = this.placement;

    if (queryParam) {
      request.addQueryParam(queryParam, key);
    } else {
      request.addHeader(header!, key);
    }

    return request;
  }
}
