import {
  isBaseAdapterException,
  isHttpException,
  isNetworkException,
  isTimeoutException,
  isConnectionRefusedException,
  isDnsResolutionException,
  isSocketResetException,
  isHostUnreachableException,
  isUnknownException,
  isCircuitBreakerOpenException,
  isValidationException,
} from '../../src/exceptions/exception.guards';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { ValidationException } from '../../src/exceptions/validation.exception';
import { Response } from '../../src/models/response';
import { CircuitBreakerOpenException } from '../../src/exceptions/circuit-breaker-open.exception';
import {
  BadRequestException,
  NotFoundException,
} from '../../src/exceptions/http-status.exceptions';
import {
  NetworkException,
  TimeoutException,
  ConnectionRefusedException,
  DnsResolutionException,
  SocketResetException,
  HostUnreachableException,
} from '../../src/exceptions/network.exceptions';
import { UnknownException } from '../../src/exceptions/unknown.exception';

const mockResponse = (status: number) => Response.create(null, status, null);

describe('Exception Type Guards', () => {
  describe('isBaseAdapterException', () => {
    it('returns true for any BaseAdapterException subclass', () => {
      expect(isBaseAdapterException(new BadRequestException(mockResponse(400)))).toBe(true);
      expect(isBaseAdapterException(new TimeoutException())).toBe(true);
      expect(isBaseAdapterException(new UnknownException())).toBe(true);
    });

    it('returns false for plain Error and non-exceptions', () => {
      expect(isBaseAdapterException(new Error('plain'))).toBe(false);
      expect(isBaseAdapterException('string')).toBe(false);
      expect(isBaseAdapterException(null)).toBe(false);
    });
  });

  describe('isHttpException', () => {
    it('returns true for HttpException subclasses', () => {
      expect(isHttpException(new BadRequestException(mockResponse(400)))).toBe(true);
      expect(isHttpException(new NotFoundException(mockResponse(404)))).toBe(true);
    });

    it('returns false for NetworkException and plain errors', () => {
      expect(isHttpException(new TimeoutException())).toBe(false);
      expect(isHttpException(new Error('plain'))).toBe(false);
    });
  });

  describe('isNetworkException', () => {
    it('returns true for NetworkException and all subclasses', () => {
      expect(isNetworkException(new NetworkException())).toBe(true);
      expect(isNetworkException(new TimeoutException())).toBe(true);
      expect(isNetworkException(new ConnectionRefusedException())).toBe(true);
      expect(isNetworkException(new SocketResetException())).toBe(true);
      expect(isNetworkException(new HostUnreachableException())).toBe(true);
    });

    it('returns false for HttpException', () => {
      expect(isNetworkException(new BadRequestException(mockResponse(400)))).toBe(false);
    });
  });

  describe('isTimeoutException', () => {
    it('returns true only for TimeoutException', () => {
      expect(isTimeoutException(new TimeoutException())).toBe(true);
    });

    it('returns false for other NetworkException subclasses', () => {
      expect(isTimeoutException(new ConnectionRefusedException())).toBe(false);
      expect(isTimeoutException(new SocketResetException())).toBe(false);
    });
  });

  describe('isConnectionRefusedException', () => {
    it('returns true for ConnectionRefusedException', () => {
      expect(isConnectionRefusedException(new ConnectionRefusedException())).toBe(true);
    });

    it('returns false for other exceptions', () => {
      expect(isConnectionRefusedException(new TimeoutException())).toBe(false);
    });
  });

  describe('isDnsResolutionException', () => {
    it('returns true for DnsResolutionException', () => {
      expect(isDnsResolutionException(new DnsResolutionException())).toBe(true);
    });

    it('returns false for other exceptions', () => {
      expect(isDnsResolutionException(new TimeoutException())).toBe(false);
    });
  });

  describe('isSocketResetException', () => {
    it('returns true for SocketResetException', () => {
      expect(isSocketResetException(new SocketResetException())).toBe(true);
    });

    it('returns false for other exceptions', () => {
      expect(isSocketResetException(new ConnectionRefusedException())).toBe(false);
    });
  });

  describe('isHostUnreachableException', () => {
    it('returns true for HostUnreachableException', () => {
      expect(isHostUnreachableException(new HostUnreachableException())).toBe(true);
    });

    it('returns false for other network exceptions', () => {
      expect(isHostUnreachableException(new DnsResolutionException())).toBe(false);
    });
  });

  describe('isUnknownException', () => {
    it('returns true for UnknownException', () => {
      expect(isUnknownException(new UnknownException())).toBe(true);
    });

    it('returns false for other exceptions', () => {
      expect(isUnknownException(new BadRequestException(mockResponse(400)))).toBe(false);
    });
  });

  describe('isCircuitBreakerOpenException', () => {
    it('returns true for CircuitBreakerOpenException', () => {
      expect(isCircuitBreakerOpenException(new CircuitBreakerOpenException())).toBe(true);
    });

    it('returns false for other exceptions', () => {
      expect(isCircuitBreakerOpenException(new UnknownException())).toBe(false);
      expect(isCircuitBreakerOpenException(new Error('plain'))).toBe(false);
    });
  });

  describe('isValidationException', () => {
    it('returns true for ValidationException', () => {
      const exception = new ValidationException('invalid', Response.create({}, 200, null));
      expect(isValidationException(exception)).toBe(true);
    });

    it('returns false for other exceptions', () => {
      expect(isValidationException(new UnknownException())).toBe(false);
      expect(isValidationException(new Error('plain'))).toBe(false);
    });
  });

  describe('type narrowing', () => {
    it('narrows type correctly after isHttpException guard', () => {
      const error: BaseAdapterException = new NotFoundException(mockResponse(404));

      if (isHttpException(error)) {
        expect(error.response.status).toBe(404);
        expect(error.isClientError()).toBe(true);
      } else {
        fail('Guard should have narrowed to HttpException');
      }
    });

    it('narrows type correctly after isTimeoutException guard', () => {
      const error: BaseAdapterException = new TimeoutException('Timed out', 'ETIMEDOUT');

      if (isTimeoutException(error)) {
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.isRetryable()).toBe(true);
      } else {
        fail('Guard should have narrowed to TimeoutException');
      }
    });
  });
});
