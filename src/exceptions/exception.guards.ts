import { BaseAdapterException } from './base-adapter.exception';
import { CircuitBreakerOpenException } from './circuit-breaker-open.exception';
import { HttpException } from './http-status.exceptions';
import {
  NetworkException,
  TimeoutException,
  ConnectionRefusedException,
  DnsResolutionException,
  SocketResetException,
  HostUnreachableException,
} from './network.exceptions';
import { UnknownException } from './unknown.exception';
import { ValidationException } from './validation.exception';

export function isBaseAdapterException(error: unknown): error is BaseAdapterException {
  return error instanceof BaseAdapterException;
}

export function isHttpException(error: unknown): error is HttpException {
  return error instanceof HttpException;
}

export function isNetworkException(error: unknown): error is NetworkException {
  return error instanceof NetworkException;
}

export function isTimeoutException(error: unknown): error is TimeoutException {
  return error instanceof TimeoutException;
}

export function isConnectionRefusedException(error: unknown): error is ConnectionRefusedException {
  return error instanceof ConnectionRefusedException;
}

export function isDnsResolutionException(error: unknown): error is DnsResolutionException {
  return error instanceof DnsResolutionException;
}

export function isSocketResetException(error: unknown): error is SocketResetException {
  return error instanceof SocketResetException;
}

export function isHostUnreachableException(error: unknown): error is HostUnreachableException {
  return error instanceof HostUnreachableException;
}

export function isUnknownException(error: unknown): error is UnknownException {
  return error instanceof UnknownException;
}

export function isCircuitBreakerOpenException(
  error: unknown,
): error is CircuitBreakerOpenException {
  return error instanceof CircuitBreakerOpenException;
}

export function isValidationException<TCause = unknown>(
  error: unknown,
): error is ValidationException<TCause> {
  return error instanceof ValidationException;
}
