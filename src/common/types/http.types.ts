/** A JSON primitive. */
export type JsonPrimitive = string | number | boolean | null;

/** Any value that can be encoded as JSON: primitives, arrays and objects, nested to any depth. */
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/**
 * A JSON object. Properties set to `undefined` are allowed and are dropped on serialization,
 * like `JSON.stringify` does.
 */
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/**
 * The structured body of an HTTP request: a JSON object whose values may be primitives,
 * arrays or nested objects, e.g. `{ items: [{ sku: 'A1', qty: 2 }] }`.
 *
 * For a body that is not an object (XML, a top-level array, a signed payload),
 * serialize it yourself and use `RequestBuilder.setRawBody()`.
 */
export type HttpBody = JsonObject;
