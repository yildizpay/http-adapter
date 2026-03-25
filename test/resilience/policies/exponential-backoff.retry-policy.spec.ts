import { ExponentialBackoffPolicy } from '../../../src/resilience/policies/exponential-backoff.retry-policy';
import { HttpExceptionFactory } from '../../../src/exceptions/http-exception.factory';
import {
  TimeoutException,
  ConnectionRefusedException,
  SocketResetException,
  DnsResolutionException,
  HostUnreachableException,
} from '../../../src/exceptions/network.exceptions';
import { UnknownException } from '../../../src/exceptions/unknown.exception';

describe('ExponentialBackoffPolicy', () => {
  let policy: ExponentialBackoffPolicy;

  beforeEach(() => {
    policy = new ExponentialBackoffPolicy();
  });

  describe('retryOn', () => {
    const retryableStatuses = [429, 502, 503, 504];
    const nonRetryableStatuses = [400, 401, 403, 404, 422, 500];

    retryableStatuses.forEach((status) => {
      it(`should return true for HTTP ${status}`, () => {
        expect(policy.retryOn(HttpExceptionFactory.createFromResponse(status))).toBe(true);
      });
    });

    nonRetryableStatuses.forEach((status) => {
      it(`should return false for HTTP ${status}`, () => {
        expect(policy.retryOn(HttpExceptionFactory.createFromResponse(status))).toBe(false);
      });
    });

    it('should return true for TimeoutException', () => {
      expect(policy.retryOn(new TimeoutException())).toBe(true);
    });

    it('should return true for ConnectionRefusedException', () => {
      expect(policy.retryOn(new ConnectionRefusedException())).toBe(true);
    });

    it('should return true for SocketResetException', () => {
      expect(policy.retryOn(new SocketResetException())).toBe(true);
    });

    it('should return false for DnsResolutionException', () => {
      expect(policy.retryOn(new DnsResolutionException())).toBe(false);
    });

    it('should return false for HostUnreachableException', () => {
      expect(policy.retryOn(new HostUnreachableException())).toBe(false);
    });

    it('should return false for UnknownException', () => {
      expect(policy.retryOn(new UnknownException())).toBe(false);
    });

    it('should return false for plain Error', () => {
      expect(policy.retryOn(new Error('generic'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(policy.retryOn(null)).toBe(false);
    });

    it('should return false for string', () => {
      expect(policy.retryOn('string error')).toBe(false);
    });

    it('should return false for raw status object (not a BaseAdapterException)', () => {
      expect(policy.retryOn({ response: { status: 503 } })).toBe(false);
    });
  });

  describe('backoffMs', () => {
    it('should calculate delay within expected range for attempt 1', () => {
      const delay = policy.backoffMs(1);
      expect(delay).toBeGreaterThanOrEqual(200);
      expect(delay).toBeLessThanOrEqual(250);
    });

    it('should calculate delay within expected range for attempt 2', () => {
      const delay = policy.backoffMs(2);
      expect(delay).toBeGreaterThanOrEqual(400);
      expect(delay).toBeLessThanOrEqual(450);
    });

    it('should calculate delay within expected range for attempt 3', () => {
      const delay = policy.backoffMs(3);
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(850);
    });
  });

  describe('constructor', () => {
    it('should set default maxAttempts to 3', () => {
      expect(policy.maxAttempts).toBe(3);
    });

    it('should allow overriding maxAttempts', () => {
      const customPolicy = new ExponentialBackoffPolicy(5);
      expect(customPolicy.maxAttempts).toBe(5);
    });
  });
});
