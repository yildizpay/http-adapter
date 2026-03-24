import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  PaymentRequiredException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  NotAcceptableException,
  ProxyAuthenticationRequiredException,
  RequestTimeoutException,
  ConflictException,
  GoneException,
  LengthRequiredException,
  PreconditionFailedException,
  PayloadTooLargeException,
  URITooLongException,
  UnsupportedMediaTypeException,
  RangeNotSatisfiableException,
  ExpectationFailedException,
  ImATeapotException,
  MisdirectedRequestException,
  UnprocessableEntityException,
  LockedException,
  FailedDependencyException,
  TooEarlyException,
  UpgradeRequiredException,
  PreconditionRequiredException,
  TooManyRequestsException,
  RequestHeaderFieldsTooLargeException,
  UnavailableForLegalReasonsException,
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
  HTTPVersionNotSupportedException,
  VariantAlsoNegotiatesException,
  InsufficientStorageException,
  LoopDetectedException,
  NotExtendedException,
  NetworkAuthenticationRequiredException,
} from '../../src/exceptions/http-status.exceptions';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { Response } from '../../src/models/response';

describe('HttpStatusExceptions', () => {
  it('instantiates BadRequestException with status 400 and full parameters', () => {
    const mockResponse = Response.create({ field: 'email' }, 400, { 'x-req': '1' });
    const error = new BadRequestException(mockResponse, 'Invalid data', 'ERR_BAD_REQ');
    expect(error).toBeInstanceOf(BaseAdapterException);
    expect(error).toBeInstanceOf(HttpException);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toBe('Invalid data');
    expect(error.name).toBe('BadRequestException');
    expect(error.code).toBe('ERR_BAD_REQ');
    expect(error.response.status).toBe(400);
    expect(error.response.data).toEqual({ field: 'email' });
    expect(error.response.headers).toEqual({ 'x-req': '1' });
  });

  const defaultTestCases = [
    { cls: BadRequestException, msg: 'Bad Request', name: 'BadRequestException', status: 400 },
    { cls: UnauthorizedException, msg: 'Unauthorized', name: 'UnauthorizedException', status: 401 },
    {
      cls: PaymentRequiredException,
      msg: 'Payment Required',
      name: 'PaymentRequiredException',
      status: 402,
    },
    { cls: ForbiddenException, msg: 'Forbidden', name: 'ForbiddenException', status: 403 },
    { cls: NotFoundException, msg: 'Not Found', name: 'NotFoundException', status: 404 },
    {
      cls: MethodNotAllowedException,
      msg: 'Method Not Allowed',
      name: 'MethodNotAllowedException',
      status: 405,
    },
    {
      cls: NotAcceptableException,
      msg: 'Not Acceptable',
      name: 'NotAcceptableException',
      status: 406,
    },
    {
      cls: ProxyAuthenticationRequiredException,
      msg: 'Proxy Authentication Required',
      name: 'ProxyAuthenticationRequiredException',
      status: 407,
    },
    {
      cls: RequestTimeoutException,
      msg: 'Request Timeout',
      name: 'RequestTimeoutException',
      status: 408,
    },
    { cls: ConflictException, msg: 'Conflict', name: 'ConflictException', status: 409 },
    { cls: GoneException, msg: 'Gone', name: 'GoneException', status: 410 },
    {
      cls: LengthRequiredException,
      msg: 'Length Required',
      name: 'LengthRequiredException',
      status: 411,
    },
    {
      cls: PreconditionFailedException,
      msg: 'Precondition Failed',
      name: 'PreconditionFailedException',
      status: 412,
    },
    {
      cls: PayloadTooLargeException,
      msg: 'Payload Too Large',
      name: 'PayloadTooLargeException',
      status: 413,
    },
    { cls: URITooLongException, msg: 'URI Too Long', name: 'URITooLongException', status: 414 },
    {
      cls: UnsupportedMediaTypeException,
      msg: 'Unsupported Media Type',
      name: 'UnsupportedMediaTypeException',
      status: 415,
    },
    {
      cls: RangeNotSatisfiableException,
      msg: 'Range Not Satisfiable',
      name: 'RangeNotSatisfiableException',
      status: 416,
    },
    {
      cls: ExpectationFailedException,
      msg: 'Expectation Failed',
      name: 'ExpectationFailedException',
      status: 417,
    },
    { cls: ImATeapotException, msg: "I'm a teapot", name: 'ImATeapotException', status: 418 },
    {
      cls: MisdirectedRequestException,
      msg: 'Misdirected Request',
      name: 'MisdirectedRequestException',
      status: 421,
    },
    {
      cls: UnprocessableEntityException,
      msg: 'Unprocessable Entity',
      name: 'UnprocessableEntityException',
      status: 422,
    },
    { cls: LockedException, msg: 'Locked', name: 'LockedException', status: 423 },
    {
      cls: FailedDependencyException,
      msg: 'Failed Dependency',
      name: 'FailedDependencyException',
      status: 424,
    },
    { cls: TooEarlyException, msg: 'Too Early', name: 'TooEarlyException', status: 425 },
    {
      cls: UpgradeRequiredException,
      msg: 'Upgrade Required',
      name: 'UpgradeRequiredException',
      status: 426,
    },
    {
      cls: PreconditionRequiredException,
      msg: 'Precondition Required',
      name: 'PreconditionRequiredException',
      status: 428,
    },
    {
      cls: TooManyRequestsException,
      msg: 'Too Many Requests',
      name: 'TooManyRequestsException',
      status: 429,
    },
    {
      cls: RequestHeaderFieldsTooLargeException,
      msg: 'Request Header Fields Too Large',
      name: 'RequestHeaderFieldsTooLargeException',
      status: 431,
    },
    {
      cls: UnavailableForLegalReasonsException,
      msg: 'Unavailable For Legal Reasons',
      name: 'UnavailableForLegalReasonsException',
      status: 451,
    },
    {
      cls: InternalServerErrorException,
      msg: 'Internal Server Error',
      name: 'InternalServerErrorException',
      status: 500,
    },
    {
      cls: NotImplementedException,
      msg: 'Not Implemented',
      name: 'NotImplementedException',
      status: 501,
    },
    { cls: BadGatewayException, msg: 'Bad Gateway', name: 'BadGatewayException', status: 502 },
    {
      cls: ServiceUnavailableException,
      msg: 'Service Unavailable',
      name: 'ServiceUnavailableException',
      status: 503,
    },
    {
      cls: GatewayTimeoutException,
      msg: 'Gateway Timeout',
      name: 'GatewayTimeoutException',
      status: 504,
    },
    {
      cls: HTTPVersionNotSupportedException,
      msg: 'HTTP Version Not Supported',
      name: 'HTTPVersionNotSupportedException',
      status: 505,
    },
    {
      cls: VariantAlsoNegotiatesException,
      msg: 'Variant Also Negotiates',
      name: 'VariantAlsoNegotiatesException',
      status: 506,
    },
    {
      cls: InsufficientStorageException,
      msg: 'Insufficient Storage',
      name: 'InsufficientStorageException',
      status: 507,
    },
    {
      cls: LoopDetectedException,
      msg: 'Loop Detected',
      name: 'LoopDetectedException',
      status: 508,
    },
    { cls: NotExtendedException, msg: 'Not Extended', name: 'NotExtendedException', status: 510 },
    {
      cls: NetworkAuthenticationRequiredException,
      msg: 'Network Authentication Required',
      name: 'NetworkAuthenticationRequiredException',
      status: 511,
    },
  ];

  defaultTestCases.forEach(({ cls, msg, name, status }) => {
    it(`instantiates ${name} with default message and status ${status}`, () => {
      const mockResponse = Response.create(null, status, null);
      const error = new cls(mockResponse);
      expect(error.message).toBe(msg);
      expect(error.name).toBe(name);
      expect(error.response.status).toBe(status);
    });
  });

  describe('HttpException Helpers', () => {
    it('correctly identifies client errors (4xx)', () => {
      const error = new HttpException(Response.create(null, 400, null), 'Error');
      expect(error.isClientError()).toBe(true);
      expect(error.isServerError()).toBe(false);
    });

    it('correctly identifies server errors (5xx)', () => {
      const error = new HttpException(Response.create(null, 500, null), 'Error');
      expect(error.isClientError()).toBe(false);
      expect(error.isServerError()).toBe(true);
    });

    it('parses retry-after header correctly (seconds)', () => {
      const error = new HttpException(Response.create(null, 429, { 'retry-after': '30' }), 'Error');
      expect(error.getRetryAfterMs()).toBe(30000);
    });

    it('parses retry-after header correctly (date)', () => {
      const futureDate = new Date(Date.now() + 60000);
      const error = new HttpException(
        Response.create(null, 429, { 'retry-after': futureDate.toUTCString() }),
        'Error',
      );
      const delay = error.getRetryAfterMs();
      expect(delay).toBeGreaterThan(59000);
      expect(delay).toBeLessThan(61000);
    });

    it('returns undefined when no retry-after header exists', () => {
      const error = new HttpException(Response.create(null, 429, {}), 'Error');
      expect(error.getRetryAfterMs()).toBeUndefined();
    });

    it('returns undefined when headers are null', () => {
      const error = new HttpException(Response.create(null, 429, null), 'Error');
      expect(error.getRetryAfterMs()).toBeUndefined();
    });

    it('returns undefined for a non-parseable retry-after value', () => {
      const error = new HttpException(
        Response.create(null, 429, { 'retry-after': 'not-a-number-or-date' }),
        'Error',
      );
      expect(error.getRetryAfterMs()).toBeUndefined();
    });

    it('parses capitalized Retry-After header', () => {
      const error = new HttpException(Response.create(null, 429, { 'Retry-After': '10' }), 'Error');
      expect(error.getRetryAfterMs()).toBe(10000);
    });
  });
});
