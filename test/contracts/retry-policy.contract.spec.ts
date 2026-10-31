import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryPolicy } from '../../src/contracts/retry-policy.contract';
import { HttpExceptionFactory } from '../../src/exceptions/http-exception.factory';
import { SocketResetException, TimeoutException } from '../../src/exceptions/network.exceptions';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { NotFoundException } from '../../src/exceptions/http-status.exceptions';
import { RetryPredicate } from '../../src/contracts/retry-predicate.contract';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { Response } from '../../src/models/response';

class TestPolicy extends RetryPolicy {
  maxAttempts = 3;
  backoffMs(): number {
    return 0;
  }
}

describe('RetryPolicy', () => {
  let policy: TestPolicy;

  beforeEach(() => {
    policy = new TestPolicy();
  });

  describe('retryOn (default behaviour)', () => {
    it('should return true for a retryable BaseAdapterException', () => {
      expect(policy.retryOn(HttpExceptionFactory.createFromResponse(429))).toBe(true);
    });

    it('should return false for a non-retryable BaseAdapterException', () => {
      expect(policy.retryOn(HttpExceptionFactory.createFromResponse(404))).toBe(false);
    });

    it('should return false for a non-adapter error', () => {
      expect(policy.retryOn(new Error('generic'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(policy.retryOn(null)).toBe(false);
    });
  });

  describe('retryOn with request context', () => {
    it.each([HttpMethod.POST, HttpMethod.PATCH])(
      'should not retry a socket reset for non-idempotent %s',
      (method) => {
        expect(policy.retryOn(new SocketResetException(), { method })).toBe(false);
      },
    );

    it.each([
      HttpMethod.GET,
      HttpMethod.HEAD,
      HttpMethod.OPTIONS,
      HttpMethod.PUT,
      HttpMethod.DELETE,
    ])('should retry a socket reset for idempotent %s', (method) => {
      expect(policy.retryOn(new SocketResetException(), { method })).toBe(true);
    });

    it('should retry a socket reset when no context is given', () => {
      expect(policy.retryOn(new SocketResetException())).toBe(true);
    });

    it('should leave other retryable errors unchanged for POST', () => {
      expect(policy.retryOn(new TimeoutException(), { method: HttpMethod.POST })).toBe(true);
    });

    it('should let a custom predicate override the safety rule', () => {
      policy.retryIf(() => true);
      expect(policy.retryOn(new SocketResetException(), { method: HttpMethod.POST })).toBe(true);
    });
  });

  describe('retryIf with function predicate', () => {
    it('should use the provided function instead of isRetryable()', () => {
      policy.retryIf(() => true);
      expect(policy.retryOn(HttpExceptionFactory.createFromResponse(404))).toBe(true);
    });

    it('should pass the error to the predicate function', () => {
      const received: BaseAdapterException[] = [];
      const err = new TimeoutException();
      policy.retryIf((e) => {
        received.push(e);
        return false;
      });
      policy.retryOn(err);
      expect(received[0]).toBe(err);
    });

    it('should return false when predicate function returns false', () => {
      policy.retryIf(() => false);
      expect(policy.retryOn(HttpExceptionFactory.createFromResponse(429))).toBe(false);
    });

    it('should not call the predicate for non-adapter errors', () => {
      const predicate = vi.fn(() => true);
      policy.retryIf(predicate);
      policy.retryOn(new Error('plain'));
      expect(predicate).not.toHaveBeenCalled();
    });

    it('should return the policy instance for chaining', () => {
      expect(policy.retryIf(() => true)).toBe(policy);
    });
  });

  describe('retryIf with RetryPredicate instance', () => {
    it('should delegate to shouldRetry on the predicate instance', () => {
      const predicate: RetryPredicate = { shouldRetry: () => true };
      policy.retryIf(predicate);
      expect(policy.retryOn(new NotFoundException(Response.create(null, 404, null), ''))).toBe(
        true,
      );
    });

    it('should pass the error to shouldRetry', () => {
      const received: BaseAdapterException[] = [];
      const err = new TimeoutException();
      const predicate: RetryPredicate = {
        shouldRetry: (e) => {
          received.push(e);
          return true;
        },
      };
      policy.retryIf(predicate);
      policy.retryOn(err);
      expect(received[0]).toBe(err);
    });
  });
});
