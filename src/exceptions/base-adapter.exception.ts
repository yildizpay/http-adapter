export class BaseAdapterException extends Error {
  public readonly code?: string;
  public readonly cause?: unknown;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = 'BaseAdapterException';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, BaseAdapterException.prototype);
  }
}
