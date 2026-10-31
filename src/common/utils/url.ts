/**
 * URL helpers for combining a base URL with a request endpoint.
 *
 * @internal
 */

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:\/\//i;
const ENDPOINT_PARTS = /^([^?#]*)(\?[^#]*)?(#.*)?$/;

/**
 * Combines `baseUrl` and `endpoint` into the request URL.
 *
 * Unlike `new URL(endpoint, baseUrl)`, the base path is always kept:
 * `https://api.example.com/v1` + `/users` → `https://api.example.com/v1/users`.
 * Exactly one `/` separates the two paths, a query string on the endpoint is appended
 * to any query on the base, and an absolute endpoint (`https://…`) is used as-is.
 */
export function joinUrl(baseUrl: string, endpoint: string): URL {
  if (ABSOLUTE_URL.test(endpoint)) return new URL(endpoint);

  const url = new URL(baseUrl);
  const [, path, search, hash] = ENDPOINT_PARTS.exec(endpoint)!;

  if (path) {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }
  if (search) {
    for (const [key, value] of new URLSearchParams(search)) url.searchParams.append(key, value);
  }
  if (hash) url.hash = hash;

  return url;
}
