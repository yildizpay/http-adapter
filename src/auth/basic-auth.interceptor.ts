import { HttpRequestInterceptor } from '../contracts/http-interceptor.contract';
import { Request } from '../models/request';

/**
 * An interceptor that attaches HTTP Basic Authentication credentials to every
 * outgoing request via the `Authorization` header.
 *
 * Credentials are Base64-encoded as `username:password` per RFC 7617.
 *
 * @example
 * ```typescript
 * BasicAuthInterceptor.of('admin', 'secret')
 * ```
 */
export class BasicAuthInterceptor implements HttpRequestInterceptor {
  private readonly encoded: string;

  private constructor(username: string, password: string) {
    this.encoded = Buffer.from(`${username}:${password}`).toString('base64');
  }

  /**
   * Creates a new `BasicAuthInterceptor` with the given credentials.
   *
   * @param username - The username to authenticate with.
   * @param password - The password to authenticate with.
   */
  public static of(username: string, password: string): BasicAuthInterceptor {
    return new BasicAuthInterceptor(username, password);
  }

  public async onRequest(request: Request): Promise<Request> {
    request.addHeader('Authorization', `Basic ${this.encoded}`);
    return request;
  }
}
