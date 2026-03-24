import { BaseAdapterException } from './base-adapter.exception';
import { RequestContext } from '../models/request-context';

/**
 * Fallback exception thrown when the adapter encounters an error shape
 * it cannot recognize or normalize into HttpException or NetworkException.
 */
export class UnknownException extends BaseAdapterException {
  public readonly requestContext?: RequestContext;

  constructor(
    message: string = 'An unknown error occurred within the adapter',
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, undefined, cause);
    this.name = 'UnknownException';
    this.requestContext = requestContext;
    Object.setPrototypeOf(this, UnknownException.prototype);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.requestContext && { request: this.requestContext }),
    };
  }
}
