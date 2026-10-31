import { HttpMethod } from '../common/enums/http-method.enum';
import type { HttpBody } from '../common/types/http.types';
import { findHeaderKey } from '../common/utils/headers';
import { isJsonMediaType, mediaTypeOf } from '../common/utils/media-type';
import type { HttpClientRequestConfig } from '../contracts/http-client.contract';

/** Methods whose requests carry a body by definition; an empty body is still sent for them. */
const BODY_METHODS = new Set<string>([HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH]);

const FORM_URLENCODED = 'application/x-www-form-urlencoded';

/**
 * Serializes the body of a request into the string that goes over the wire.
 *
 * This is the single place where request bodies are encoded. `FetchHttpClient` uses it,
 * and custom `HttpClientContract` implementations should use it too so every transport
 * sends the same bytes.
 *
 * Rules:
 * - GET and HEAD never carry a body.
 * - A `rawBody` (set via `RequestBuilder.setRawBody()`) is sent as-is.
 * - DELETE and OPTIONS only send a structured body when it has content.
 * - The structured body is encoded according to the `Content-Type` header:
 *   - `application/x-www-form-urlencoded` → `a=1&b=2` (flat objects only)
 *   - JSON (`application/json`, `*+json`) or no Content-Type → `JSON.stringify`
 *   - any other type (e.g. XML) → throws; serialize it yourself and use `setRawBody()`
 *
 * @param config - The transport request configuration.
 * @returns The serialized body, or `undefined` when no body should be sent.
 * @throws {TypeError} When the body cannot be encoded for its Content-Type.
 */
export function serializeRequestBody(config: HttpClientRequestConfig): string | undefined {
  const { method, data, rawBody, headers = {} } = config;

  if (method === HttpMethod.GET || method === HttpMethod.HEAD) return undefined;
  if (rawBody !== undefined) return rawBody;
  if (!data) return undefined;
  if (!BODY_METHODS.has(method) && Object.keys(data).length === 0) return undefined;

  const contentTypeKey = findHeaderKey(headers, 'Content-Type');
  const mediaType = contentTypeKey ? mediaTypeOf(headers[contentTypeKey]!) : undefined;

  if (mediaType === FORM_URLENCODED) return encodeForm(data);
  if (mediaType === undefined || isJsonMediaType(mediaType)) return JSON.stringify(data);

  throw new TypeError(
    `Cannot serialize an object body as "${mediaType}". ` +
      'Serialize it yourself and pass the string with RequestBuilder.setRawBody().',
  );
}

function encodeForm(data: HttpBody): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') {
      throw new TypeError(
        `Cannot form-urlencode nested object at "${key}". Flatten the body or use JSON.`,
      );
    }
    params.append(key, String(value));
  }
  return params.toString();
}
