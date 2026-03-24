import { BaseAdapterException } from './base-adapter.exception';
import { RequestContext } from '../models/request-context';

export class NetworkException extends BaseAdapterException {
  public readonly requestContext?: RequestContext;

  constructor(
    message: string = 'Network Error',
    code?: string,
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, code, cause);
    this.name = 'NetworkException';
    this.requestContext = requestContext;
    Object.setPrototypeOf(this, NetworkException.prototype);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.requestContext && { request: this.requestContext }),
    };
  }
}

export class ConnectionRefusedException extends NetworkException {
  constructor(
    message: string = 'Connection Refused',
    code: string = 'ECONNREFUSED',
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, code, cause, requestContext);
    this.name = 'ConnectionRefusedException';
    Object.setPrototypeOf(this, ConnectionRefusedException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class DnsResolutionException extends NetworkException {
  constructor(
    message: string = 'DNS Resolution Failed',
    code: string = 'ENOTFOUND',
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, code, cause, requestContext);
    this.name = 'DnsResolutionException';
    Object.setPrototypeOf(this, DnsResolutionException.prototype);
  }
}

export class TimeoutException extends NetworkException {
  constructor(
    message: string = 'Request Timeout',
    code: string = 'ECONNABORTED',
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, code, cause, requestContext);
    this.name = 'TimeoutException';
    Object.setPrototypeOf(this, TimeoutException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class SocketResetException extends NetworkException {
  constructor(
    message: string = 'Connection Reset',
    code: string = 'ECONNRESET',
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, code, cause, requestContext);
    this.name = 'SocketResetException';
    Object.setPrototypeOf(this, SocketResetException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class HostUnreachableException extends NetworkException {
  constructor(
    message: string = 'Host Unreachable',
    code: string = 'EHOSTUNREACH',
    cause?: unknown,
    requestContext?: RequestContext,
  ) {
    super(message, code, cause, requestContext);
    this.name = 'HostUnreachableException';
    Object.setPrototypeOf(this, HostUnreachableException.prototype);
  }
}
