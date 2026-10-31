/**
 * Case-insensitive helpers for plain-object header maps.
 *
 * HTTP header names are case-insensitive, but headers are stored as plain objects.
 * These helpers make sure a header exists under at most one spelling.
 *
 * @internal
 */

export function findHeaderKey(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  return Object.keys(headers).find((key) => key.toLowerCase() === lower);
}

/** Sets a header, replacing any existing entry with the same name in a different case. */
export function setHeader(headers: Record<string, string>, name: string, value: string): void {
  deleteHeader(headers, name);
  headers[name] = value;
}

/** Removes every entry whose name matches `name` case-insensitively. */
export function deleteHeader(headers: Record<string, string>, name: string): void {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) delete headers[key];
  }
}
