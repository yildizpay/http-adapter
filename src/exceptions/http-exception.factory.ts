import { Response } from '../models/response';
import { RequestContext } from '../models/request-context';
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
} from './http-status.exceptions';

/**
 * Constructor signature that all HTTP status exception classes must satisfy.
 *
 * @template T - The type of the response payload.
 */
type HttpExceptionConstructor<T> = new (
  response: Response<T>,
  message?: string,
  code?: string,
  cause?: unknown,
) => HttpException<T>;

/**
 * O(1) lookup registry mapping IANA-registered HTTP status codes to their
 * corresponding semantic {@link HttpException} subclasses.
 *
 * Covers all standard 4xx client errors (400–451) and 5xx server errors (500–511).
 * Unmapped status codes fall through to the base {@link HttpException}.
 */
const HttpStatusExceptionMap: Record<number, HttpExceptionConstructor<unknown>> = {
  400: BadRequestException,
  401: UnauthorizedException,
  402: PaymentRequiredException,
  403: ForbiddenException,
  404: NotFoundException,
  405: MethodNotAllowedException,
  406: NotAcceptableException,
  407: ProxyAuthenticationRequiredException,
  408: RequestTimeoutException,
  409: ConflictException,
  410: GoneException,
  411: LengthRequiredException,
  412: PreconditionFailedException,
  413: PayloadTooLargeException,
  414: URITooLongException,
  415: UnsupportedMediaTypeException,
  416: RangeNotSatisfiableException,
  417: ExpectationFailedException,
  418: ImATeapotException,
  421: MisdirectedRequestException,
  422: UnprocessableEntityException,
  423: LockedException,
  424: FailedDependencyException,
  425: TooEarlyException,
  426: UpgradeRequiredException,
  428: PreconditionRequiredException,
  429: TooManyRequestsException,
  431: RequestHeaderFieldsTooLargeException,
  451: UnavailableForLegalReasonsException,
  500: InternalServerErrorException,
  501: NotImplementedException,
  502: BadGatewayException,
  503: ServiceUnavailableException,
  504: GatewayTimeoutException,
  505: HTTPVersionNotSupportedException,
  506: VariantAlsoNegotiatesException,
  507: InsufficientStorageException,
  508: LoopDetectedException,
  510: NotExtendedException,
  511: NetworkAuthenticationRequiredException,
};

/**
 * Factory responsible for creating semantic {@link HttpException} subclasses
 * from raw HTTP response data.
 *
 * Uses an internal O(1) status-code registry to resolve the most specific
 * exception class. Unmapped or custom status codes gracefully fall back to
 * the base {@link HttpException}.
 *
 * @example
 * ```ts
 * // Creates a NotFoundException with response context
 * const error = HttpExceptionFactory.createFromResponse(404, body, headers);
 *
 * // Unmapped status falls back to base HttpException
 * const custom = HttpExceptionFactory.createFromResponse(499);
 * ```
 */
export class HttpExceptionFactory {
  /**
   * Creates a strongly-typed {@link HttpException} subclass based on the given status code.
   *
   * Internally constructs a {@link Response} object from the provided data, status,
   * and headers, then resolves the appropriate exception class from the registry.
   *
   * @template T - The type of the response payload.
   * @param status - The HTTP status code (e.g., 400, 404, 500).
   * @param data - The parsed response body, if available.
   * @param headers - The response headers, if available.
   * @param message - A custom error message. When omitted, the exception's built-in
   *   default message is used for mapped statuses, or a generic fallback for unmapped ones.
   * @param code - An optional application-level error code (e.g., `'RATE_LIMITED'`).
   * @param cause - The original error that triggered this exception, preserved for debugging.
   * @returns A strongly-typed {@link HttpException} instance matching the status code.
   */
  public static createFromResponse<T = unknown>(
    status: number,
    data?: T,
    headers?: Record<string, string>,
    message?: string,
    code?: string,
    cause?: unknown,
    requestContext?: RequestContext,
  ): HttpException<T> {
    const response = Response.create(data as T, status, headers ?? null, requestContext);
    const ExceptionClass = HttpStatusExceptionMap[status];

    if (ExceptionClass) {
      return new ExceptionClass(
        response as Response<unknown>,
        message,
        code,
        cause,
      ) as HttpException<T>;
    }

    return new HttpException(
      response,
      message ?? `Request failed with status ${status}`,
      code,
      cause,
    );
  }
}
