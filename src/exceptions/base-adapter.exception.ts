import type { DeliveryOutcome } from './delivery-outcome';

export class BaseAdapterException extends Error {
  public readonly code?: string;

  /**
   * Whether the request reached the server. See {@link DeliveryOutcome}.
   *
   * Decide whether a failed payment may be sent again, or sent to another provider, from this
   * value: only `not_sent` guarantees that the first attempt had no effect.
   */
  public readonly deliveryOutcome: DeliveryOutcome;

  constructor(
    message: string,
    code?: string,
    cause?: unknown,
    deliveryOutcome: DeliveryOutcome = 'unknown',
  ) {
    super(message, { cause });
    this.name = 'BaseAdapterException';
    this.code = code;
    this.deliveryOutcome = deliveryOutcome;
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
      deliveryOutcome: this.deliveryOutcome,
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
