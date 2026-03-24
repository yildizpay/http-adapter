import { BaseAdapterException } from './base-adapter.exception';

export class NetworkException extends BaseAdapterException {
  constructor(message: string = 'Network Error', code?: string, cause?: unknown) {
    super(message, code, cause);
    this.name = 'NetworkException';
    Object.setPrototypeOf(this, NetworkException.prototype);
  }
}

export class ConnectionRefusedException extends NetworkException {
  constructor(
    message: string = 'Connection Refused',
    code: string = 'ECONNREFUSED',
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = 'ConnectionRefusedException';
    Object.setPrototypeOf(this, ConnectionRefusedException.prototype);
  }
}

export class DnsResolutionException extends NetworkException {
  constructor(
    message: string = 'DNS Resolution Failed',
    code: string = 'ENOTFOUND',
    cause?: unknown,
  ) {
    super(message, code, cause);
    this.name = 'DnsResolutionException';
    Object.setPrototypeOf(this, DnsResolutionException.prototype);
  }
}

export class TimeoutException extends NetworkException {
  constructor(message: string = 'Request Timeout', code: string = 'ECONNABORTED', cause?: unknown) {
    super(message, code, cause);
    this.name = 'TimeoutException';
    Object.setPrototypeOf(this, TimeoutException.prototype);
  }
}
