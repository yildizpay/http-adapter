export class BaseAdapterException extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'BaseAdapterException';
    this.code = code;
    Object.setPrototypeOf(this, BaseAdapterException.prototype);
  }
}
