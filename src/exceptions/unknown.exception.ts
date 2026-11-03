import type { RequestContext } from '../models/request-context';
import { BaseAdapterException } from './base-adapter.exception';
import type { DeliveryOutcome } from './delivery-outcome';

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
    deliveryOutcome: DeliveryOutcome = 'unknown',
  ) {
    super(message, undefined, cause, deliveryOutcome);
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
