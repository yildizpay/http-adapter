import {
  HttpClientContract,
  HttpClientRequestConfig,
  HttpClientResponse,
} from '../contracts/http-client.contract';
import { NetworkExceptionFactory } from '../exceptions/network-exception.factory';
import { HttpExceptionFactory } from '../exceptions/http-exception.factory';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';

/**
 * The default HTTP client instance based on native Fetch API (Node 18+).
 *
 * This client translates our flexible request architecture to the Fetch API
 * without relying on heavy external dependencies like Axios.
 */
export class FetchHttpClient implements HttpClientContract {
  public async request<T = unknown>(
    config: HttpClientRequestConfig,
  ): Promise<HttpClientResponse<T>> {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    if (config.timeout && config.timeout > 0) {
      timeoutId = setTimeout(() => controller.abort(), config.timeout);
    }

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body:
          config.method !== 'GET' && config.method !== 'HEAD' && config.data
            ? JSON.stringify(config.data)
            : undefined,
        signal: controller.signal,
      });

      let responseData: unknown = null;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json().catch(() => null);
      } else {
        responseData = await response.text().catch(() => null);
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        throw HttpExceptionFactory.createFromResponse(
          response.status,
          responseData as T,
          responseHeaders,
          `Request failed with status ${response.status}`,
        );
      }

      return {
        data: responseData as T,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error: unknown) {
      if (error instanceof BaseAdapterException) throw error;
      throw NetworkExceptionFactory.createFromNativeError(error);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}

export const defaultHttpClient = new FetchHttpClient();
