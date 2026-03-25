import { Response } from '../models/response';
import { BaseAdapterException } from './base-adapter.exception';

/**
 * Thrown when a `ResponseValidator` determines that a response does not satisfy
 * the expected schema or business rules.
 *
 * Carries the original `Response` object so callers can inspect the raw data
 * that caused the failure.
 *
 * The optional generic parameter `TCause` narrows the type of `cause` for callers
 * who know the underlying error (e.g. `ValidationException<ZodError>`). When omitted,
 * `cause` is typed as `unknown` and can be cast manually.
 *
 * @template TCause - The expected type of the underlying cause (default: `unknown`).
 */
export class ValidationException<TCause = unknown> extends BaseAdapterException {
  public override readonly name = 'ValidationException';
  public readonly response: Response;
  public override readonly cause: TCause | undefined;

  public constructor(message: string, response: Response, cause?: TCause) {
    super(message, 'ERR_VALIDATION', cause);
    this.response = response;
    this.cause = cause;
    Object.setPrototypeOf(this, ValidationException.prototype);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      response: {
        status: this.response.status,
        data: this.response.data,
        request: this.response.requestContext,
      },
    };
  }
}
