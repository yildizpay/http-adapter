import { Response } from '../models/response';
import { BaseAdapterException } from './base-adapter.exception';

export class HttpException<T = unknown> extends BaseAdapterException {
  public readonly response: Response<T>;

  constructor(response: Response<T>, message: string, code?: string, cause?: unknown) {
    super(message, code, cause);
    this.name = 'HttpException';
    this.response = response;
    Object.setPrototypeOf(this, HttpException.prototype);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      response: {
        status: this.response.status,
        data: this.response.data,
        headers: this.response.headers,
        ...(this.response.requestContext && { request: this.response.requestContext }),
      },
    };
  }

  public isClientError(): boolean {
    return this.response.status >= 400 && this.response.status < 500;
  }

  public isServerError(): boolean {
    return this.response.status >= 500 && this.response.status < 600;
  }

  public getRetryAfterMs(): number | undefined {
    const headers = this.response.headers;
    if (!headers) return undefined;
    const key = Object.keys(headers).find((k) => k.toLowerCase() === 'retry-after');
    const headerValue = key ? headers[key] : undefined;
    if (!headerValue) return undefined;

    const asSeconds = Number.parseInt(headerValue, 10);
    if (!Number.isNaN(asSeconds)) {
      return asSeconds * 1000;
    }

    const asDate = Date.parse(headerValue);
    if (!Number.isNaN(asDate)) {
      const delay = asDate - Date.now();
      return Math.max(0, delay);
    }

    return undefined;
  }
}

export class BadRequestException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Bad Request',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'BadRequestException';
    Object.setPrototypeOf(this, BadRequestException.prototype);
  }
}

export class UnauthorizedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Unauthorized',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'UnauthorizedException';
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}

export class PaymentRequiredException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Payment Required',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'PaymentRequiredException';
    Object.setPrototypeOf(this, PaymentRequiredException.prototype);
  }
}

export class ForbiddenException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Forbidden',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'ForbiddenException';
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}

export class NotFoundException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Not Found',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'NotFoundException';
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

export class MethodNotAllowedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Method Not Allowed',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'MethodNotAllowedException';
    Object.setPrototypeOf(this, MethodNotAllowedException.prototype);
  }
}

export class NotAcceptableException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Not Acceptable',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'NotAcceptableException';
    Object.setPrototypeOf(this, NotAcceptableException.prototype);
  }
}

export class ProxyAuthenticationRequiredException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Proxy Authentication Required',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'ProxyAuthenticationRequiredException';
    Object.setPrototypeOf(this, ProxyAuthenticationRequiredException.prototype);
  }
}

export class RequestTimeoutException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Request Timeout',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'RequestTimeoutException';
    Object.setPrototypeOf(this, RequestTimeoutException.prototype);
  }
}

export class ConflictException<T = unknown> extends HttpException<T> {
  constructor(response: Response<T>, message: string = 'Conflict', code?: string, cause?: unknown) {
    super(response, message, code, cause);
    this.name = 'ConflictException';
    Object.setPrototypeOf(this, ConflictException.prototype);
  }
}

export class GoneException<T = unknown> extends HttpException<T> {
  constructor(response: Response<T>, message: string = 'Gone', code?: string, cause?: unknown) {
    super(response, message, code, cause);
    this.name = 'GoneException';
    Object.setPrototypeOf(this, GoneException.prototype);
  }
}

export class LengthRequiredException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Length Required',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'LengthRequiredException';
    Object.setPrototypeOf(this, LengthRequiredException.prototype);
  }
}

export class PreconditionFailedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Precondition Failed',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'PreconditionFailedException';
    Object.setPrototypeOf(this, PreconditionFailedException.prototype);
  }
}

export class PayloadTooLargeException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Payload Too Large',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'PayloadTooLargeException';
    Object.setPrototypeOf(this, PayloadTooLargeException.prototype);
  }
}

export class URITooLongException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'URI Too Long',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'URITooLongException';
    Object.setPrototypeOf(this, URITooLongException.prototype);
  }
}

export class UnsupportedMediaTypeException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Unsupported Media Type',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'UnsupportedMediaTypeException';
    Object.setPrototypeOf(this, UnsupportedMediaTypeException.prototype);
  }
}

export class RangeNotSatisfiableException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Range Not Satisfiable',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'RangeNotSatisfiableException';
    Object.setPrototypeOf(this, RangeNotSatisfiableException.prototype);
  }
}

export class ExpectationFailedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Expectation Failed',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'ExpectationFailedException';
    Object.setPrototypeOf(this, ExpectationFailedException.prototype);
  }
}

export class ImATeapotException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = "I'm a teapot",
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'ImATeapotException';
    Object.setPrototypeOf(this, ImATeapotException.prototype);
  }
}

export class MisdirectedRequestException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Misdirected Request',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'MisdirectedRequestException';
    Object.setPrototypeOf(this, MisdirectedRequestException.prototype);
  }
}

export class UnprocessableEntityException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Unprocessable Entity',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'UnprocessableEntityException';
    Object.setPrototypeOf(this, UnprocessableEntityException.prototype);
  }
}

export class LockedException<T = unknown> extends HttpException<T> {
  constructor(response: Response<T>, message: string = 'Locked', code?: string, cause?: unknown) {
    super(response, message, code, cause);
    this.name = 'LockedException';
    Object.setPrototypeOf(this, LockedException.prototype);
  }
}

export class FailedDependencyException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Failed Dependency',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'FailedDependencyException';
    Object.setPrototypeOf(this, FailedDependencyException.prototype);
  }
}

export class TooEarlyException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Too Early',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'TooEarlyException';
    Object.setPrototypeOf(this, TooEarlyException.prototype);
  }
}

export class UpgradeRequiredException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Upgrade Required',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'UpgradeRequiredException';
    Object.setPrototypeOf(this, UpgradeRequiredException.prototype);
  }
}

export class PreconditionRequiredException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Precondition Required',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'PreconditionRequiredException';
    Object.setPrototypeOf(this, PreconditionRequiredException.prototype);
  }
}

export class TooManyRequestsException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Too Many Requests',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'TooManyRequestsException';
    Object.setPrototypeOf(this, TooManyRequestsException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class RequestHeaderFieldsTooLargeException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Request Header Fields Too Large',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'RequestHeaderFieldsTooLargeException';
    Object.setPrototypeOf(this, RequestHeaderFieldsTooLargeException.prototype);
  }
}

export class UnavailableForLegalReasonsException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Unavailable For Legal Reasons',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'UnavailableForLegalReasonsException';
    Object.setPrototypeOf(this, UnavailableForLegalReasonsException.prototype);
  }
}

export class InternalServerErrorException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Internal Server Error',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'InternalServerErrorException';
    Object.setPrototypeOf(this, InternalServerErrorException.prototype);
  }
}

export class NotImplementedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Not Implemented',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'NotImplementedException';
    Object.setPrototypeOf(this, NotImplementedException.prototype);
  }
}

export class BadGatewayException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Bad Gateway',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'BadGatewayException';
    Object.setPrototypeOf(this, BadGatewayException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class ServiceUnavailableException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Service Unavailable',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'ServiceUnavailableException';
    Object.setPrototypeOf(this, ServiceUnavailableException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class GatewayTimeoutException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Gateway Timeout',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'GatewayTimeoutException';
    Object.setPrototypeOf(this, GatewayTimeoutException.prototype);
  }

  public override isRetryable(): boolean {
    return true;
  }
}

export class HTTPVersionNotSupportedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'HTTP Version Not Supported',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'HTTPVersionNotSupportedException';
    Object.setPrototypeOf(this, HTTPVersionNotSupportedException.prototype);
  }
}

export class VariantAlsoNegotiatesException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Variant Also Negotiates',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'VariantAlsoNegotiatesException';
    Object.setPrototypeOf(this, VariantAlsoNegotiatesException.prototype);
  }
}

export class InsufficientStorageException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Insufficient Storage',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'InsufficientStorageException';
    Object.setPrototypeOf(this, InsufficientStorageException.prototype);
  }
}

export class LoopDetectedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Loop Detected',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'LoopDetectedException';
    Object.setPrototypeOf(this, LoopDetectedException.prototype);
  }
}

export class NotExtendedException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Not Extended',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'NotExtendedException';
    Object.setPrototypeOf(this, NotExtendedException.prototype);
  }
}

export class NetworkAuthenticationRequiredException<T = unknown> extends HttpException<T> {
  constructor(
    response: Response<T>,
    message: string = 'Network Authentication Required',
    code?: string,
    cause?: unknown,
  ) {
    super(response, message, code, cause);
    this.name = 'NetworkAuthenticationRequiredException';
    Object.setPrototypeOf(this, NetworkAuthenticationRequiredException.prototype);
  }
}
