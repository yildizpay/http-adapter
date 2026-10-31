/**
 * Media type helpers for Content-Type header values.
 *
 * @internal
 */

/** Returns the lowercase media type without parameters, e.g. `application/json`. */
export function mediaTypeOf(contentType: string): string {
  return contentType.split(';')[0]!.trim().toLowerCase();
}

/** `true` for `application/json` and structured-syntax `+json` types (RFC 6839). */
export function isJsonMediaType(mediaType: string): boolean {
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}
