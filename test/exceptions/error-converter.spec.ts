import { ErrorConverter } from '../../src/core/error.converter';
import {
  HttpException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '../../src/exceptions/http-status.exceptions';
import {
  NetworkException,
  ConnectionRefusedException,
  DnsResolutionException,
  TimeoutException,
  SocketResetException,
} from '../../src/exceptions/network.exceptions';
import { UnknownException } from '../../src/exceptions/unknown.exception';
import { CircuitBreakerOpenException } from '../../src/exceptions/circuit-breaker-open.exception';

describe('ErrorConverter', () => {
  describe('passthrough for existing BaseAdapterException instances', () => {
    it('should return HttpException as-is', () => {
      const original = new BadRequestException({ status: 400, data: null } as never);
      const result = ErrorConverter.toAdapterException(original);
      expect(result).toBe(original);
    });

    it('should return NetworkException as-is', () => {
      const original = new ConnectionRefusedException();
      const result = ErrorConverter.toAdapterException(original);
      expect(result).toBe(original);
    });

    it('should return UnknownException as-is', () => {
      const original = new UnknownException('Already handled');
      const result = ErrorConverter.toAdapterException(original);
      expect(result).toBe(original);
    });

    it('should return CircuitBreakerOpenException as-is', () => {
      const original = new CircuitBreakerOpenException('CB open');
      const result = ErrorConverter.toAdapterException(original);
      expect(result).toBe(original);
    });
  });

  describe('context propagation (correlationId, url)', () => {
    it('should attach correlationId to HttpException response when provided', () => {
      const rawError = { status: 404, message: 'Not Found' };
      const result = ErrorConverter.toAdapterException(rawError, {
        correlationId: 'corr-abc-123',
      });
      expect(result).toBeInstanceOf(NotFoundException);
      expect((result as NotFoundException).response.systemCorrelationId).toBe('corr-abc-123');
    });

    it('should not fail when context is omitted', () => {
      const rawError = { status: 400, message: 'Bad' };
      expect(() => ErrorConverter.toAdapterException(rawError)).not.toThrow();
    });
  });

  describe('HTTP-like error detection (status-based)', () => {
    it('should convert a flat object with status into a semantic HttpException', () => {
      const rawError = {
        status: 400,
        data: { error: 'invalid' },
        headers: { 'x-trace': '123' },
        message: 'Bad Request',
      };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(BadRequestException);
      expect(result.message).toBe('Bad Request');
      const httpExc = result as BadRequestException;
      expect(httpExc.response.status).toBe(400);
      expect(httpExc.response.data).toEqual({ error: 'invalid' });
    });

    it('should convert an Axios-like error with nested response.status', () => {
      const rawError = {
        response: {
          status: 404,
          data: { detail: 'Resource not found' },
          headers: { 'content-type': 'application/json' },
        },
      };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.name).toBe('NotFoundException');
      const httpExc = result as NotFoundException;
      expect(httpExc.response.status).toBe(404);
      expect(httpExc.response.data).toEqual({ detail: 'Resource not found' });
    });

    it('should convert a 500 status into InternalServerErrorException', () => {
      const rawError = { status: 500, data: 'Internal failure' };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(InternalServerErrorException);
    });

    it('should generate a fallback message when no message is provided', () => {
      const rawError = { status: 503 };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result.message).toBe('Request failed with status 503');
    });

    it('should prefer top-level status over nested response.status', () => {
      const rawError = {
        status: 400,
        response: { status: 500 },
      };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(BadRequestException);
    });

    it('should preserve the error code from the original error', () => {
      const rawError = {
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result.code).toBe('RATE_LIMITED');
    });

    it('should preserve the original error as cause', () => {
      const rawError = { status: 400, message: 'Bad' };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result.cause).toBe(rawError);
    });

    it('should fallback to base HttpException for unmapped status codes', () => {
      const rawError = { status: 499, message: 'Custom status' };
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(HttpException);
      expect(result.name).toBe('HttpException');
    });
  });

  describe('network-like error detection (code/name-based)', () => {
    it('should convert an Error with ECONNREFUSED into ConnectionRefusedException', () => {
      const rawError = new Error('refused');
      (rawError as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(ConnectionRefusedException);
      expect(result.code).toBe('ECONNREFUSED');
    });

    it('should convert a native AbortError into TimeoutException', () => {
      const rawError = new Error('The operation was aborted');
      rawError.name = 'AbortError';
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(TimeoutException);
    });

    it('should convert an Error with ETIMEDOUT into TimeoutException', () => {
      const rawError = new Error('Connection timed out');
      (rawError as NodeJS.ErrnoException).code = 'ETIMEDOUT';
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(TimeoutException);
      expect(result.code).toBe('ETIMEDOUT');
    });

    it('should convert an Error with ECONNRESET into SocketResetException', () => {
      const rawError = new Error('Connection reset by peer');
      (rawError as NodeJS.ErrnoException).code = 'ECONNRESET';
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(SocketResetException);
      expect(result.code).toBe('ECONNRESET');
    });

    it('should convert an Error with ENOTFOUND into DnsResolutionException', () => {
      const rawError = new Error('getaddrinfo ENOTFOUND');
      (rawError as NodeJS.ErrnoException).code = 'ENOTFOUND';
      const result = ErrorConverter.toAdapterException(rawError);
      expect(result).toBeInstanceOf(DnsResolutionException);
    });

    it('should handle plain object with code (non-Error) via NetworkExceptionFactory', () => {
      const plainObj = { code: 'ECONNREFUSED', message: 'plain message' };
      const result = ErrorConverter.toAdapterException(plainObj);
      expect(result).toBeInstanceOf(NetworkException);
      expect(result.message).toBe('plain message');
    });

    it('should handle plain object with name AbortError (non-Error)', () => {
      const plainObj = { name: 'AbortError', message: 'aborted' };
      const result = ErrorConverter.toAdapterException(plainObj);
      expect(result).toBeInstanceOf(NetworkException);
    });

    it('should attach url from context to NetworkException', () => {
      const rawError = new Error('refused');
      (rawError as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      const result = ErrorConverter.toAdapterException(rawError, {
        url: 'https://api.example.com/pay',
      });
      expect(result).toBeInstanceOf(ConnectionRefusedException);
      expect((result as ConnectionRefusedException).url).toBe('https://api.example.com/pay');
    });
  });

  describe('standard Error without status or code (UnknownException)', () => {
    it('should wrap a plain Error into UnknownException', () => {
      const error = new Error('Something went wrong');
      const result = ErrorConverter.toAdapterException(error);
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.message).toBe('Something went wrong');
      expect(result.cause).toBe(error);
    });

    it('should wrap a TypeError into UnknownException', () => {
      const error = new TypeError('Cannot read properties of undefined');
      const result = ErrorConverter.toAdapterException(error);
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.cause).toBe(error);
    });
  });

  describe('primitive and edge-case inputs', () => {
    it('should wrap a string error into UnknownException', () => {
      const result = ErrorConverter.toAdapterException('Connection lost');
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.message).toBe('Connection lost');
    });

    it('should wrap null into UnknownException with default message', () => {
      const result = ErrorConverter.toAdapterException(null);
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.message).toBe('Unknown Adapter Error');
    });

    it('should wrap undefined into UnknownException with default message', () => {
      const result = ErrorConverter.toAdapterException(undefined);
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.message).toBe('Unknown Adapter Error');
    });

    it('should wrap a number into UnknownException with default message', () => {
      const result = ErrorConverter.toAdapterException(42);
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.message).toBe('Unknown Adapter Error');
    });

    it('should wrap a boolean into UnknownException with default message', () => {
      const result = ErrorConverter.toAdapterException(false);
      expect(result).toBeInstanceOf(UnknownException);
      expect(result.message).toBe('Unknown Adapter Error');
    });

    it('should wrap an empty plain object into UnknownException', () => {
      const result = ErrorConverter.toAdapterException({});
      expect(result).toBeInstanceOf(UnknownException);
    });
  });

  describe('UnknownException and NetworkException default constructors', () => {
    it('should use default message for UnknownException', () => {
      const error = new UnknownException();
      expect(error.message).toBe('An unknown error occurred within the adapter');
      expect(error.name).toBe('UnknownException');
    });

    it('should use default message for NetworkException', () => {
      const error = new NetworkException();
      expect(error.message).toBe('Network Error');
      expect(error.name).toBe('NetworkException');
    });
  });
});
