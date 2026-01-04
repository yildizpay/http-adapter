import { StrUtil } from "../common/utils/str.util";
import { HttpMethod } from "../common/enums/http-method.enum";
import { HttpBody } from "../common/types/http.types";

/**
 * Represents an immutable HTTP request.
 *
 * This class encapsulates all necessary details for an HTTP request, including
 * the destination URL, method, headers, query parameters, and body. It also
 * automatically generates a correlation ID for tracing purposes.
 */
export class Request {
  /**
   * A unique identifier for tracing this specific request across the system.
   * Automatically generated upon instantiation.
   */
  public readonly systemCorrelationId: string;

  /**
   * The timestamp when the request object was created or last updated.
   */
  public timestamp: Date;

  /**
   * Initializes a new instance of the Request class.
   *
   * @param baseUrl - The base URL of the API.
   * @param endpoint - The specific endpoint path (relative to the baseUrl).
   * @param method - The HTTP method to use (default: POST).
   * @param headers - A dictionary of HTTP headers (default: empty).
   * @param queryParams - A dictionary of query string parameters (default: empty).
   * @param body - The request body payload, or null if none (default: null).
   */
  public constructor(
    public readonly baseUrl: string,
    public readonly endpoint: string,
    public readonly method: HttpMethod = HttpMethod.POST,
    public readonly headers: Record<string, string> = {},
    public readonly queryParams: Record<string, string> = {},
    public readonly body: HttpBody | null = null
  ) {
    this.systemCorrelationId = StrUtil.generateUuid();
    this.timestamp = new Date();
  }

  /**
   * Adds a parameter to the request body.
   *
   * @param key - The key of the parameter.
   * @param value - The value of the parameter.
   * @throws Error if the body is null (not initialized).
   */
  public addParam(key: string, value: string | number | Record<string, any>) {
    if (this.body == null) throw new Error("Body is not defined");
    this.body[key] = value;
  }

  /**
   * Adds a header to the request.
   *
   * @param key - The name of the header.
   * @param value - The value of the header.
   */
  public addHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  /**
   * Adds a query string parameter to the request.
   *
   * @param key - The name of the query parameter.
   * @param value - The value of the query parameter.
   */
  public addQueryParam(key: string, value: string) {
    this.queryParams[key] = value;
  }

  /**
   * Updates the timestamp of the request.
   *
   * @param timestamp - The new timestamp.
   */
  public setTimestamp(timestamp: Date) {
    this.timestamp = timestamp;
  }

  /**
   * Creates a debug-friendly representation of the request.
   *
   * @returns An object containing the core properties of the request, suitable for logging.
   */
  public toDebugObject() {
    return {
      baseUrl: this.baseUrl,
      endpoint: this.endpoint,
      method: this.method,
      headers: this.headers,
      queryParams: this.queryParams,
      body: this.body,
    };
  }
}
