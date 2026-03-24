import { BaseAdapterException } from './base-adapter.exception';

/**
 * Fallback exception thrown when the adapter encounters an error shape
 * it cannot recognize or normalize into HttpException or NetworkException.
 */
export class UnknownException extends BaseAdapterException {
  constructor(message: string = 'An unknown error occurred within the adapter', cause?: unknown) {
    super(message, undefined, cause);
    this.name = 'UnknownException';
    Object.setPrototypeOf(this, UnknownException.prototype);
  }
}
