import { NetworkExceptionFactory } from '../../src/exceptions/network-exception.factory';
import {
  NetworkException,
  ConnectionRefusedException,
  DnsResolutionException,
  TimeoutException,
  SocketResetException,
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

  it('creates generic NetworkException for unknown Error codes', () => {
    const error = makeErrnoError('Some random network OS error', 'E_UNKNOWN');
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(NetworkException);
    expect(exception.code).toBe('E_UNKNOWN');
  });

  it('attaches url to the created exception when provided', () => {
    const error = makeErrnoError('refused', 'ECONNREFUSED');
    const exception = NetworkExceptionFactory.createFromNativeError(
      error,
      'https://api.example.com/pay',
    );
    expect(exception).toBeInstanceOf(ConnectionRefusedException);
    expect(exception.url).toBe('https://api.example.com/pay');
  });

  it('handles non-Error objects by wrapping them generically', () => {
    const exception1 = NetworkExceptionFactory.createFromNativeError('Just a string error');
    expect(exception1).toBeInstanceOf(NetworkException);
    expect(exception1.message).toBe('Just a string error');

    const exception2 = NetworkExceptionFactory.createFromNativeError(123);
    expect(exception2).toBeInstanceOf(NetworkException);
    expect(exception2.message).toBe('Unknown Network Error');
  });

  it('attaches url to non-Error exceptions when provided', () => {
    const exception = NetworkExceptionFactory.createFromNativeError(
      'Just a string error',
      'https://api.example.com/pay',
    );
    expect(exception.url).toBe('https://api.example.com/pay');
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

  it('preserves url on NetworkException subclasses', () => {
    const error = new ConnectionRefusedException(
      'Connection Refused',
      'ECONNREFUSED',
      undefined,
      'https://api.example.com/pay',
    );
    expect(error.url).toBe('https://api.example.com/pay');
  });
});
