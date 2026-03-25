/**
 * A token provider is either a static string or a function that returns a token
 * synchronously or asynchronously.
 *
 * Used by auth interceptors to support both hardcoded tokens and dynamic token
 * retrieval (e.g. from a cache, secret store, or OAuth2 flow).
 *
 * @example
 * ```typescript
 * // Static token
 * const provider: TokenProvider = 'my-static-token';
 *
 * // Dynamic token
 * const provider: TokenProvider = async () => await secretStore.get('api-token');
 * ```
 */
export type TokenProvider = string | (() => string | Promise<string>);

/**
 * Resolves a `TokenProvider` to its string value.
 *
 * @param provider - A static string or a sync/async factory function.
 * @returns The resolved token string.
 */
export async function resolveToken(provider: TokenProvider): Promise<string> {
  return typeof provider === 'function' ? provider() : provider;
}
