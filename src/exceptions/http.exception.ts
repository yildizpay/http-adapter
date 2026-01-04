import { Response } from '../models/response';

/**
 * Represents an error that occurs during an HTTP request.
 *
 * This exception is thrown when an HTTP request fails (e.g., network error) OR
 * when the server returns a non-success status code (if configured to do so).
 * It encapsulates the original error message and the partial or complete response
 * if available.
 */
export class HttpException extends Error {
  /**
   * Initializes a new instance of the HttpException class.
   *
   * @param message - The error message.
   * @param response - The HTTP response associated with the exception, if any.
   */
  public constructor(
    message: string,
    public readonly response: Response<any> | null,
  ) {
    super(message);
    Object.setPrototypeOf(this, HttpException.prototype);
  }
}
