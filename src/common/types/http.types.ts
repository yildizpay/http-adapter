/**
 * Represents the structure of a generic HTTP request body.
 *
 * This interface defines a recursive type that allows for flexible modeling of JSON-like
 * objects often used in API payloads. It supports primitives (string, number, boolean, null, undefined)
 * as well as nested `HttpBody` objects.
 */
export interface HttpBody {
  [key: string]: string | number | boolean | null | undefined | HttpBody;
}
