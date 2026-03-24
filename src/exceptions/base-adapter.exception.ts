export class BaseAdapterException extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'BaseAdapterException';
    this.code = code;
    Object.setPrototypeOf(this, BaseAdapterException.prototype);
  }

  /**
   * Indicates whether this exception represents a condition that is safe to retry.
   * Defaults to `false`; retryable subclasses override this to return `true`.
   */
  public isRetryable(): boolean {
    return false;
  }

  /**
   * Returns a plain serializable object representation of this exception.
   * Suitable for structured logging (e.g. JSON log entries, Datadog, Sentry).
   *
   * `JSON.stringify(error)` on an Error subclass yields `{}` because Error
   * properties are non-enumerable. This method explicitly enumerates them.
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      ...(this.code !== undefined && { code: this.code }),
      ...(this.cause !== undefined && { cause: BaseAdapterException.serializeCause(this.cause) }),
      stack: this.stack,
    };
  }

  private static serializeCause(cause: unknown): unknown {
    if (cause instanceof BaseAdapterException) {
      return cause.toJSON();
    }

    if (cause instanceof Error) {
      return { name: cause.name, message: cause.message, stack: cause.stack };
    }

    return cause;
  }
}
