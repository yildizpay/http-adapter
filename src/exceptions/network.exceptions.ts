import { BaseAdapterException } from './base-adapter.exception';

export class NetworkException extends BaseAdapterException {
  public readonly url?: string;

  constructor(message: string = 'Network Error', code?: string, cause?: unknown, url?: string) {
    super(message, code, cause);
    this.name = 'NetworkException';
    this.url = url;
    Object.setPrototypeOf(this, NetworkException.prototype);
  }
}

export class ConnectionRefusedException extends NetworkException {
  constructor(
    message: string = 'Connection Refused',
    code: string = 'ECONNREFUSED',
    cause?: unknown,
    url?: string,
  ) {
    super(message, code, cause, url);
    this.name = 'ConnectionRefusedException';
    Object.setPrototypeOf(this, ConnectionRefusedException.prototype);
  }
}

export class DnsResolutionException extends NetworkException {
  constructor(
    message: string = 'DNS Resolution Failed',
    code: string = 'ENOTFOUND',
    cause?: unknown,
    url?: string,
  ) {
    super(message, code, cause, url);
    this.name = 'DnsResolutionException';
    Object.setPrototypeOf(this, DnsResolutionException.prototype);
  }
}

export class TimeoutException extends NetworkException {
  constructor(
    message: string = 'Request Timeout',
    code: string = 'ECONNABORTED',
    cause?: unknown,
    url?: string,
  ) {
    super(message, code, cause, url);
    this.name = 'TimeoutException';
    Object.setPrototypeOf(this, TimeoutException.prototype);
  }
}

export class SocketResetException extends NetworkException {
  constructor(
    message: string = 'Connection Reset',
    code: string = 'ECONNRESET',
    cause?: unknown,
    url?: string,
  ) {
    super(message, code, cause, url);
    this.name = 'SocketResetException';
    Object.setPrototypeOf(this, SocketResetException.prototype);
  }
}
