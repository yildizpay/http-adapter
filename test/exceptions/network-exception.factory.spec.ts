import { describe, it, expect } from 'vitest';
import { NetworkExceptionFactory } from '../../src/exceptions/network-exception.factory';
import {
  NetworkException,
  ConnectionRefusedException,
  DnsResolutionException,
  TimeoutException,
  SocketResetException,
  HostUnreachableException,
} from '../../src/exceptions/network.exceptions';

function makeErrnoError(message: string, code: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(message);
  error.code = code;
  return error;
}

describe('NetworkExceptionFactory', () => {
  it('creates TimeoutException from AbortError', () => {
    const error = new Error('The user aborted a request.');
    error.name = 'AbortError';
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(TimeoutException);
    expect(exception.code).toBe('ECONNABORTED');
    expect(exception.cause).toBe(error);
  });

  it('creates TimeoutException from ECONNABORTED code', () => {
    const error = makeErrnoError('Timeout', 'ECONNABORTED');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(TimeoutException);
    expect(exception.code).toBe('ECONNABORTED');
  });

  it('creates ConnectionRefusedException from ECONNREFUSED', () => {
    const error = makeErrnoError('Refused', 'ECONNREFUSED');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(ConnectionRefusedException);
    expect(exception.code).toBe('ECONNREFUSED');
  });

  it('creates DnsResolutionException from ENOTFOUND', () => {
    const error = makeErrnoError('Not found', 'ENOTFOUND');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(DnsResolutionException);
    expect(exception.code).toBe('ENOTFOUND');
  });

  it('creates DnsResolutionException from EAI_AGAIN', () => {
    const error = makeErrnoError('Try again', 'EAI_AGAIN');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(DnsResolutionException);
    expect(exception.code).toBe('EAI_AGAIN');
  });

  it('creates TimeoutException from ETIMEDOUT code', () => {
    const error = makeErrnoError('Connection timed out', 'ETIMEDOUT');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(TimeoutException);
    expect(exception.code).toBe('ETIMEDOUT');
    expect(exception.cause).toBe(error);
  });

  it('creates SocketResetException from ECONNRESET code', () => {
    const error = makeErrnoError('Connection reset by peer', 'ECONNRESET');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(SocketResetException);
    expect(exception.code).toBe('ECONNRESET');
    expect(exception.cause).toBe(error);
  });

  it('creates HostUnreachableException from EHOSTUNREACH code', () => {
    const error = makeErrnoError('No route to host', 'EHOSTUNREACH');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(HostUnreachableException);
    expect(exception.code).toBe('EHOSTUNREACH');
    expect(exception.cause).toBe(error);
  });

  it('creates HostUnreachableException from ENETUNREACH code', () => {
    const error = makeErrnoError('Network unreachable', 'ENETUNREACH');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(HostUnreachableException);
    expect(exception.code).toBe('ENETUNREACH');
  });

  it('creates generic NetworkException for unknown Error codes', () => {
    const error = makeErrnoError('Some random network OS error', 'E_UNKNOWN');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(NetworkException);
    expect(exception.code).toBe('E_UNKNOWN');
  });

  it('attaches requestContext to the created exception when provided', () => {
    const error = makeErrnoError('refused', 'ECONNREFUSED');
    const ctx = { method: 'POST', url: 'https://api.example.com/pay', correlationId: 'abc' };
    const exception = NetworkExceptionFactory.createFromNativeError(error, ctx);
    expect(exception).toBeInstanceOf(ConnectionRefusedException);
    expect(exception.requestContext).toEqual(ctx);
  });

  it('handles non-Error objects by wrapping them generically', () => {
    const exception1 = NetworkExceptionFactory.createFromNativeError('Just a string error');
    expect(exception1).toBeInstanceOf(NetworkException);
    expect(exception1.message).toBe('Just a string error');

    const exception2 = NetworkExceptionFactory.createFromNativeError(123);
    expect(exception2).toBeInstanceOf(NetworkException);
    expect(exception2.message).toBe('Unknown Network Error');
  });

  it('attaches requestContext to non-Error exceptions when provided', () => {
    const ctx = { url: 'https://api.example.com/pay' };
    const exception = NetworkExceptionFactory.createFromNativeError('Just a string error', ctx);
    expect(exception.requestContext).toEqual(ctx);
  });
});

describe('NetworkExceptionFactory with native fetch errors', () => {
  const fetchFailed = (cause: unknown) => Object.assign(new TypeError('fetch failed'), { cause });
  const systemError = (code: string, message = `connect ${code}`) =>
    Object.assign(new Error(message), { code });

  it.each([
    ['ECONNREFUSED', ConnectionRefusedException],
    ['ECONNRESET', SocketResetException],
    ['EPIPE', SocketResetException],
    ['UND_ERR_SOCKET', SocketResetException],
    ['ENOTFOUND', DnsResolutionException],
    ['EAI_AGAIN', DnsResolutionException],
    ['EHOSTUNREACH', HostUnreachableException],
    ['UND_ERR_CONNECT_TIMEOUT', TimeoutException],
    ['UND_ERR_HEADERS_TIMEOUT', TimeoutException],
    ['UND_ERR_BODY_TIMEOUT', TimeoutException],
  ])('classifies cause.code %s', (code, ExpectedClass) => {
    const error = NetworkExceptionFactory.createFromNativeError(fetchFailed(systemError(code)));

    expect(error).toBeInstanceOf(ExpectedClass);
    expect(error.code).toBe(code);
  });

  it('uses the message of the coded error and keeps the original error as cause', () => {
    const original = fetchFailed(systemError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:1'));

    const error = NetworkExceptionFactory.createFromNativeError(original);

    expect(error.message).toBe('connect ECONNREFUSED 127.0.0.1:1');
    expect(error.cause).toBe(original);
  });

  it('follows nested causes', () => {
    const nested = fetchFailed(
      Object.assign(new Error('outer'), { cause: systemError('ECONNRESET') }),
    );

    expect(NetworkExceptionFactory.createFromNativeError(nested)).toBeInstanceOf(
      SocketResetException,
    );
  });

  it('stops on cyclic causes', () => {
    const a: { name: string; message: string; cause?: unknown } = { name: 'Error', message: 'a' };
    a.cause = { name: 'Error', message: 'b', cause: a };

    expect(NetworkExceptionFactory.createFromNativeError(a)).toBeInstanceOf(NetworkException);
  });

  it('recognises errors from another realm by shape', () => {
    const foreignAbort = { name: 'AbortError', message: 'This operation was aborted' };

    expect(NetworkExceptionFactory.createFromNativeError(foreignAbort)).toBeInstanceOf(
      TimeoutException,
    );
  });

  it('classifies a TimeoutError as TimeoutException', () => {
    const error = Object.assign(new Error('timed out'), { name: 'TimeoutError' });

    expect(NetworkExceptionFactory.createFromNativeError(error)).toBeInstanceOf(TimeoutException);
  });

  it('falls back to a default message', () => {
    const error = NetworkExceptionFactory.createFromNativeError({ name: 'Error', message: '' });

    expect(error.message).toBe('Network Error');
  });

  describe('resolveCode', () => {
    it('returns a nested code', () => {
      expect(NetworkExceptionFactory.resolveCode(fetchFailed(systemError('ECONNREFUSED')))).toBe(
        'ECONNREFUSED',
      );
    });

    it('returns undefined for non-errors and errors without a code', () => {
      expect(NetworkExceptionFactory.resolveCode('boom')).toBeUndefined();
      expect(NetworkExceptionFactory.resolveCode(new Error('x'))).toBeUndefined();
    });
  });
});

describe('NetworkException Subclasses', () => {
  it('instantiates ConnectionRefusedException with defaults', () => {
    const error = new ConnectionRefusedException();
    expect(error.message).toBe('Connection Refused');
    expect(error.code).toBe('ECONNREFUSED');
  });

  it('instantiates DnsResolutionException with defaults', () => {
    const error = new DnsResolutionException();
    expect(error.message).toBe('DNS Resolution Failed');
    expect(error.code).toBe('ENOTFOUND');
  });

  it('instantiates TimeoutException with defaults', () => {
    const error = new TimeoutException();
    expect(error.message).toBe('Request Timeout');
    expect(error.code).toBe('ECONNABORTED');
  });

  it('instantiates SocketResetException with defaults', () => {
    const error = new SocketResetException();
    expect(error.message).toBe('Connection Reset');
    expect(error.code).toBe('ECONNRESET');
    expect(error.name).toBe('SocketResetException');
  });

  it('instantiates HostUnreachableException with defaults', () => {
    const error = new HostUnreachableException();
    expect(error.message).toBe('Host Unreachable');
    expect(error.code).toBe('EHOSTUNREACH');
    expect(error.name).toBe('HostUnreachableException');
  });

  it('preserves requestContext on NetworkException subclasses', () => {
    const ctx = { method: 'POST', url: 'https://api.example.com/pay' };
    const error = new ConnectionRefusedException(
      'Connection Refused',
      'ECONNREFUSED',
      undefined,
      ctx,
    );
    expect(error.requestContext).toEqual(ctx);
  });

  describe('isRetryable', () => {
    it('returns true for TimeoutException', () => {
      expect(new TimeoutException().isRetryable()).toBe(true);
    });

    it('returns true for SocketResetException', () => {
      expect(new SocketResetException().isRetryable()).toBe(true);
    });

    it('returns true for ConnectionRefusedException', () => {
      expect(new ConnectionRefusedException().isRetryable()).toBe(true);
    });

    it('returns false for DnsResolutionException', () => {
      expect(new DnsResolutionException().isRetryable()).toBe(false);
    });

    it('returns false for HostUnreachableException', () => {
      expect(new HostUnreachableException().isRetryable()).toBe(false);
    });

    it('returns false for generic NetworkException', () => {
      expect(new NetworkException().isRetryable()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('includes requestContext grouped under request key when set', () => {
      const ctx = { method: 'POST', url: 'https://api.example.com/pay', correlationId: 'abc' };
      const error = new TimeoutException('Connection timed out', 'ETIMEDOUT', undefined, ctx);
      const json = error.toJSON();

      expect(json.name).toBe('TimeoutException');
      expect(json.request).toEqual(ctx);
    });

    it('omits request when no context set', () => {
      const error = new TimeoutException();
      const json = error.toJSON();

      expect('request' in json).toBe(false);
    });

    it('is JSON.stringify compatible', () => {
      const ctx = { method: 'POST', url: 'https://api.example.com' };
      const error = new ConnectionRefusedException('Refused', 'ECONNREFUSED', undefined, ctx);
      const json = error.toJSON();

      expect(() => JSON.stringify(error)).not.toThrow();
      expect(json.name).toBe('ConnectionRefusedException');
      expect((json.request as Record<string, unknown>).url).toBe('https://api.example.com');
    });
  });
});
