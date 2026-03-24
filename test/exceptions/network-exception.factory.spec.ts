import { NetworkExceptionFactory } from '../../src/exceptions/network-exception.factory';
import {
  NetworkException,
  ConnectionRefusedException,
  DnsResolutionException,
  TimeoutException,
} from '../../src/exceptions/network.exceptions';

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
    const error = new Error('Timeout');
    (error as any).code = 'ECONNABORTED';
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(TimeoutException);
    expect(exception.code).toBe('ECONNABORTED');
  });

  it('creates ConnectionRefusedException from ECONNREFUSED', () => {
    const error = new Error('Refused');
    (error as any).code = 'ECONNREFUSED';
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(ConnectionRefusedException);
    expect(exception.code).toBe('ECONNREFUSED');
  });

  it('creates DnsResolutionException from ENOTFOUND', () => {
    const error = new Error('Not found');
    (error as any).code = 'ENOTFOUND';
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(DnsResolutionException);
    expect(exception.code).toBe('ENOTFOUND');
  });

  it('creates DnsResolutionException from EAI_AGAIN', () => {
    const error = new Error('Try again');
    (error as any).code = 'EAI_AGAIN';
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(DnsResolutionException);
    expect(exception.code).toBe('EAI_AGAIN');
  });

  it('creates generic NetworkException for unknown Error codes', () => {
    const error = new Error('Some random network OS error');
    (error as any).code = 'E_UNKNOWN';
    const exception = NetworkExceptionFactory.createFromNativeError(error);
    expect(exception).toBeInstanceOf(NetworkException);
    expect(exception.code).toBe('E_UNKNOWN');
  });

  it('handles non-Error objects by wrapping them generically', () => {
    const exception1 = NetworkExceptionFactory.createFromNativeError('Just a string error');
    expect(exception1).toBeInstanceOf(NetworkException);
    expect(exception1.message).toBe('Just a string error');

    const exception2 = NetworkExceptionFactory.createFromNativeError(123);
    expect(exception2).toBeInstanceOf(NetworkException);
    expect(exception2.message).toBe('Unknown Network Error');
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
});
