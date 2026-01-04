/**
 * Represents an immutable HTTP response.
 *
 * This class encapsulates the standard components of an HTTP response, including
 * the payload, status code, and headers. It is generic to allow for strongly-typed
 * response bodies.
 *
 * @template T - The type of the response data (payload).
 */
export class Response<T = any> {
  /**
   * The timestamp when the response object was instantiated.
   */
  public readonly timestamp: Date;

  /**
   * Initializes a new instance of the Response class.
   *
   * @param data - The parsed response body.
   * @param status - The HTTP status code (e.g., 200, 404).
   * @param headers - A dictionary of response headers, or null if unavailable.
   * @param systemCorrelationId - The unique ID correlated with the original request.
   */
  public constructor(
    public readonly data: T,
    public readonly status: number,
    public readonly headers: Record<string, string> | null,
    public readonly systemCorrelationId: string,
  ) {
    this.timestamp = new Date();
  }

  /**
   * Factory method to create a new Response instance.
   *
   * @template T - The type of the response data.
   * @param data - The parsed response body.
   * @param status - The HTTP status code.
   * @param headers - A dictionary of response headers, or null.
   * @param systemCorrelationId - The unique ID correlated with the original request.
   * @returns A new Response instance.
   */
  public static create<T = any>(
    data: T,
    status: number,
    headers: Record<string, string> | null,
    systemCorrelationId: string,
  ): Response<T> {
    return new Response<T>(data, status, headers, systemCorrelationId);
  }

  /**
   * Creates a debug-friendly representation of the response.
   *
   * @returns An object containing the core properties of the response, suitable for logging.
   * Note: This usually excludes the full body if it's large, but here it includes it.
   */
  public toDebugObject() {
    return {
      data: this.data,
      status: this.status,
      headers: this.headers,
    };
  }
}
