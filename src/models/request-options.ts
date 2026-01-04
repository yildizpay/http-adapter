/**
 * Configuration options for a single HTTP request.
 *
 * This class allows customization of request-specific parameters such as timeouts.
 */
export class RequestOptions {
  /**
   * Initializes a new instance of the RequestOptions class.
   *
   * @param timeout - The connection/read timeout in milliseconds (default: 10000ms).
   */
  public constructor(public timeout: number = 10000) {}
}
