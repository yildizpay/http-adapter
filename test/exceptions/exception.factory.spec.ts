import { HttpExceptionFactory } from '../../src/exceptions/http-exception.factory';
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

describe('HttpExceptionFactory', () => {
  it('should create BadRequestException for status 400', () => {
    const error = HttpExceptionFactory.createFromResponse(400);
    expect(error).toBeInstanceOf(BadRequestException);
  });
  it('should create UnauthorizedException for status 401', () => {
    const error = HttpExceptionFactory.createFromResponse(401);
    expect(error).toBeInstanceOf(UnauthorizedException);
  });
  it('should create PaymentRequiredException for status 402', () => {
    const error = HttpExceptionFactory.createFromResponse(402);
    expect(error).toBeInstanceOf(PaymentRequiredException);
  });
  it('should create ForbiddenException for status 403', () => {
    const error = HttpExceptionFactory.createFromResponse(403);
    expect(error).toBeInstanceOf(ForbiddenException);
  });
  it('should create NotFoundException for status 404', () => {
    const error = HttpExceptionFactory.createFromResponse(404);
    expect(error).toBeInstanceOf(NotFoundException);
  });
  it('should create MethodNotAllowedException for status 405', () => {
    const error = HttpExceptionFactory.createFromResponse(405);
    expect(error).toBeInstanceOf(MethodNotAllowedException);
  });
  it('should create NotAcceptableException for status 406', () => {
    const error = HttpExceptionFactory.createFromResponse(406);
    expect(error).toBeInstanceOf(NotAcceptableException);
  });
  it('should create ProxyAuthenticationRequiredException for status 407', () => {
    const error = HttpExceptionFactory.createFromResponse(407);
    expect(error).toBeInstanceOf(ProxyAuthenticationRequiredException);
  });
  it('should create RequestTimeoutException for status 408', () => {
    const error = HttpExceptionFactory.createFromResponse(408);
    expect(error).toBeInstanceOf(RequestTimeoutException);
  });
  it('should create ConflictException for status 409', () => {
    const error = HttpExceptionFactory.createFromResponse(409);
    expect(error).toBeInstanceOf(ConflictException);
  });
  it('should create GoneException for status 410', () => {
    const error = HttpExceptionFactory.createFromResponse(410);
    expect(error).toBeInstanceOf(GoneException);
  });
  it('should create LengthRequiredException for status 411', () => {
    const error = HttpExceptionFactory.createFromResponse(411);
    expect(error).toBeInstanceOf(LengthRequiredException);
  });
  it('should create PreconditionFailedException for status 412', () => {
    const error = HttpExceptionFactory.createFromResponse(412);
    expect(error).toBeInstanceOf(PreconditionFailedException);
  });
  it('should create PayloadTooLargeException for status 413', () => {
    const error = HttpExceptionFactory.createFromResponse(413);
    expect(error).toBeInstanceOf(PayloadTooLargeException);
  });
  it('should create URITooLongException for status 414', () => {
    const error = HttpExceptionFactory.createFromResponse(414);
    expect(error).toBeInstanceOf(URITooLongException);
  });
  it('should create UnsupportedMediaTypeException for status 415', () => {
    const error = HttpExceptionFactory.createFromResponse(415);
    expect(error).toBeInstanceOf(UnsupportedMediaTypeException);
  });
  it('should create RangeNotSatisfiableException for status 416', () => {
    const error = HttpExceptionFactory.createFromResponse(416);
    expect(error).toBeInstanceOf(RangeNotSatisfiableException);
  });
  it('should create ExpectationFailedException for status 417', () => {
    const error = HttpExceptionFactory.createFromResponse(417);
    expect(error).toBeInstanceOf(ExpectationFailedException);
  });
  it('should create ImATeapotException for status 418', () => {
    const error = HttpExceptionFactory.createFromResponse(418);
    expect(error).toBeInstanceOf(ImATeapotException);
  });
  it('should create MisdirectedRequestException for status 421', () => {
    const error = HttpExceptionFactory.createFromResponse(421);
    expect(error).toBeInstanceOf(MisdirectedRequestException);
  });
  it('should create UnprocessableEntityException for status 422', () => {
    const error = HttpExceptionFactory.createFromResponse(422);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
  });
  it('should create LockedException for status 423', () => {
    const error = HttpExceptionFactory.createFromResponse(423);
    expect(error).toBeInstanceOf(LockedException);
  });
  it('should create FailedDependencyException for status 424', () => {
    const error = HttpExceptionFactory.createFromResponse(424);
    expect(error).toBeInstanceOf(FailedDependencyException);
  });
  it('should create TooEarlyException for status 425', () => {
    const error = HttpExceptionFactory.createFromResponse(425);
    expect(error).toBeInstanceOf(TooEarlyException);
  });
  it('should create UpgradeRequiredException for status 426', () => {
    const error = HttpExceptionFactory.createFromResponse(426);
    expect(error).toBeInstanceOf(UpgradeRequiredException);
  });
  it('should create PreconditionRequiredException for status 428', () => {
    const error = HttpExceptionFactory.createFromResponse(428);
    expect(error).toBeInstanceOf(PreconditionRequiredException);
  });
  it('should create TooManyRequestsException for status 429', () => {
    const error = HttpExceptionFactory.createFromResponse(429);
    expect(error).toBeInstanceOf(TooManyRequestsException);
  });
  it('should create RequestHeaderFieldsTooLargeException for status 431', () => {
    const error = HttpExceptionFactory.createFromResponse(431);
    expect(error).toBeInstanceOf(RequestHeaderFieldsTooLargeException);
  });
  it('should create UnavailableForLegalReasonsException for status 451', () => {
    const error = HttpExceptionFactory.createFromResponse(451);
    expect(error).toBeInstanceOf(UnavailableForLegalReasonsException);
  });
  it('should create InternalServerErrorException for status 500', () => {
    const error = HttpExceptionFactory.createFromResponse(500);
    expect(error).toBeInstanceOf(InternalServerErrorException);
  });
  it('should create NotImplementedException for status 501', () => {
    const error = HttpExceptionFactory.createFromResponse(501);
    expect(error).toBeInstanceOf(NotImplementedException);
  });
  it('should create BadGatewayException for status 502', () => {
    const error = HttpExceptionFactory.createFromResponse(502);
    expect(error).toBeInstanceOf(BadGatewayException);
  });
  it('should create ServiceUnavailableException for status 503', () => {
    const error = HttpExceptionFactory.createFromResponse(503);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
  });
  it('should create GatewayTimeoutException for status 504', () => {
    const error = HttpExceptionFactory.createFromResponse(504);
    expect(error).toBeInstanceOf(GatewayTimeoutException);
  });
  it('should create HTTPVersionNotSupportedException for status 505', () => {
    const error = HttpExceptionFactory.createFromResponse(505);
    expect(error).toBeInstanceOf(HTTPVersionNotSupportedException);
  });
  it('should create VariantAlsoNegotiatesException for status 506', () => {
    const error = HttpExceptionFactory.createFromResponse(506);
    expect(error).toBeInstanceOf(VariantAlsoNegotiatesException);
  });
  it('should create InsufficientStorageException for status 507', () => {
    const error = HttpExceptionFactory.createFromResponse(507);
    expect(error).toBeInstanceOf(InsufficientStorageException);
  });
  it('should create LoopDetectedException for status 508', () => {
    const error = HttpExceptionFactory.createFromResponse(508);
    expect(error).toBeInstanceOf(LoopDetectedException);
  });
  it('should create NotExtendedException for status 510', () => {
    const error = HttpExceptionFactory.createFromResponse(510);
    expect(error).toBeInstanceOf(NotExtendedException);
  });
  it('should create NetworkAuthenticationRequiredException for status 511', () => {
    const error = HttpExceptionFactory.createFromResponse(511);
    expect(error).toBeInstanceOf(NetworkAuthenticationRequiredException);
  });

  it('should fallback to base HttpException for unknown statuses', () => {
    const error = HttpExceptionFactory.createFromResponse(418000);
    expect(Object.getPrototypeOf(error).constructor.name).toBe('HttpException');
  });

  it('should fallback to base HttpException if status is unmapped', () => {
    const error = HttpExceptionFactory.createFromResponse(499);
    expect(error).toBeInstanceOf(HttpException);
  });
});
