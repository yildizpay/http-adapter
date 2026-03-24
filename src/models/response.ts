import { RequestContext } from './request-context';

/**
 * Represents an immutable HTTP response.
 *
 * This class encapsulates the standard components of an HTTP response, including
 * the payload, status code, and headers. It is generic to allow for strongly-typed
 * response bodies.
 *
 * @template T - The type of the response data (payload).
 */
export class Response<T = unknown> {
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
   * @param requestContext - Safe metadata about the originating request.
   */
  private constructor(
    public readonly data: T,
    public readonly status: number,
    public readonly headers: Record<string, string> | null,
    public readonly requestContext?: RequestContext,
  ) {
    this.timestamp = new Date();
  }

  /**
   * The correlation ID from the originating request.
   * Derived from `requestContext.correlationId` for convenience.
   */
  public get systemCorrelationId(): string {
    return this.requestContext?.correlationId ?? '';
  }

  /**
   * Factory method to create a new Response instance.
   *
   * @template T - The type of the response data.
   * @param data - The parsed response body.
   * @param status - The HTTP status code.
   * @param headers - A dictionary of response headers, or null.
   * @param requestContext - Safe metadata about the originating request.
   * @returns A new Response instance.
   */
  public static create<T = unknown>(
    data: T,
    status: number,
    headers: Record<string, string> | null,
    requestContext?: RequestContext,
  ): Response<T> {
    return new Response<T>(data, status, headers, requestContext);
  }

  /**
   * Creates a debug-friendly, log-safe representation of the response.
   * Groups request metadata under a `request` key when available.
   */
  public toDebugObject() {
    return {
      status: this.status,
      headers: this.headers,
      data: this.data,
      ...(this.requestContext && { request: this.requestContext }),
    };
  }
}
