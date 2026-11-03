import { deleteHeader, findHeaderKey } from '../common/utils/headers';
import { isJsonMediaType, mediaTypeOf } from '../common/utils/media-type';
import type {
  HttpClientContract,
  HttpClientRequestConfig,
  HttpClientResponse,
} from '../contracts/http-client.contract';
import { BaseAdapterException } from '../exceptions/base-adapter.exception';
import { HttpExceptionFactory } from '../exceptions/http-exception.factory';
import { NetworkExceptionFactory } from '../exceptions/network-exception.factory';
import { UnknownException } from '../exceptions/unknown.exception';
import { serializeRequestBody } from './body-serializer';
import { createDeliveryState, deliveryOutcomeOf, trackDelivery } from './delivery-tracker';

/**
 * The default HTTP client instance based on native Fetch API.
 *
 * This client translates our flexible request architecture to the Fetch API
 * without relying on heavy external dependencies like Axios.
 *
 * It reports the `deliveryOutcome` of every failure. Body serialization errors happen
 * before anything is sent (`not_sent`). For network errors it records undici's
 * `diagnostics_channel` events for the call, so a timeout while connecting (`not_sent`) is
 * told apart from a timeout after the request was written (`unknown`), and a body that breaks
 * off after the response headers arrived is `received`.
 */
export class FetchHttpClient implements HttpClientContract {
  public async request<T = unknown>(
    config: HttpClientRequestConfig,
  ): Promise<HttpClientResponse<T>> {
    const body = FetchHttpClient.serialize(config);
    const delivery = createDeliveryState();
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    if (config.timeout && config.timeout > 0) {
      timeoutId = setTimeout(() => controller.abort(), config.timeout);
    }

    try {
      const { response, responseData } = await trackDelivery(delivery, async () => {
        const response = await fetch(config.url, {
          method: config.method,
          headers: FetchHttpClient.buildHeaders(config.headers, body !== undefined),
          body,
          signal: controller.signal,
        });
        return { response, responseData: await FetchHttpClient.readBody(response) };
      });

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
      throw NetworkExceptionFactory.createFromNativeError(
        error,
        undefined,
        deliveryOutcomeOf(delivery),
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /** Serializes the body; a failure here means nothing was sent. */
  private static serialize(config: HttpClientRequestConfig): string | undefined {
    try {
      return serializeRequestBody(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request body serialization failed';
      throw new UnknownException(message, error, undefined, 'not_sent');
    }
  }

  /**
   * Reads the response body. JSON media types (`application/json`, `*+json`) are parsed;
   * a JSON body that fails to parse is returned as raw text so error payloads are not lost.
   * An empty JSON body yields `null`.
   *
   * A failure while reading the body (e.g. the connection drops mid-response) propagates
   * as a network error; it must never look like a successful empty response.
   */
  private static async readBody(response: globalThis.Response): Promise<unknown> {
    const text = await response.text();
    const contentType = response.headers.get('content-type');
    if (!contentType || !isJsonMediaType(mediaTypeOf(contentType))) return text;
    if (text === '') return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Content-Type describes the body, so it is only sent when there is one; it defaults to
   * JSON unless the caller set it (in any letter case).
   */
  private static buildHeaders(
    headers: Record<string, string> = {},
    hasBody: boolean,
  ): Record<string, string> {
    const result = { ...headers };
    if (!hasBody) {
      deleteHeader(result, 'Content-Type');
    } else if (!findHeaderKey(result, 'Content-Type')) {
      result['Content-Type'] = 'application/json';
    }
    return result;
  }
}

export const defaultHttpClient = new FetchHttpClient();
