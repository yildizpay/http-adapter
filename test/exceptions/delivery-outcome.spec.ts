import { describe, expect, it } from 'vitest';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { CircuitBreakerOpenException } from '../../src/exceptions/circuit-breaker-open.exception';
import {
  getDeliveryOutcome,
  isDeliveryOutcome,
  isDeliveryUnknown,
  isNotSent,
  isReceived,
} from '../../src/exceptions/delivery-outcome';
import { BadRequestException, HttpException } from '../../src/exceptions/http-status.exceptions';
import {
  ConnectionRefusedException,
  DnsResolutionException,
  HostUnreachableException,
  NetworkException,
  SocketResetException,
  TimeoutException,
} from '../../src/exceptions/network.exceptions';
import { UnknownException } from '../../src/exceptions/unknown.exception';
import { ValidationException } from '../../src/exceptions/validation.exception';
import { Response } from '../../src/models/response';

describe('DeliveryOutcome', () => {
  const response = Response.create(null, 400, null);

  it.each([
    ['BaseAdapterException', new BaseAdapterException('x'), 'unknown'],
    ['NetworkException', new NetworkException(), 'unknown'],
    ['TimeoutException', new TimeoutException(), 'unknown'],
    ['SocketResetException', new SocketResetException(), 'unknown'],
    ['UnknownException', new UnknownException(), 'unknown'],
    ['ConnectionRefusedException', new ConnectionRefusedException(), 'not_sent'],
    ['DnsResolutionException', new DnsResolutionException(), 'not_sent'],
    ['HostUnreachableException', new HostUnreachableException(), 'not_sent'],
    ['CircuitBreakerOpenException', new CircuitBreakerOpenException(), 'not_sent'],
    ['HttpException', new HttpException(response, 'x'), 'received'],
    ['BadRequestException', new BadRequestException(response), 'received'],
    ['ValidationException', new ValidationException('x', response), 'received'],
  ])('%s defaults to %s', (_name, error, expected) => {
    expect(error.deliveryOutcome).toBe(expected);
  });

  it('accepts an explicit outcome on network and unknown exceptions', () => {
    expect(
      new TimeoutException('t', 'ETIMEDOUT', undefined, undefined, 'not_sent').deliveryOutcome,
    ).toBe('not_sent');
    expect(
      new ConnectionRefusedException('r', 'ECONNREFUSED', undefined, undefined, 'unknown')
        .deliveryOutcome,
    ).toBe('unknown');
    expect(new UnknownException('u', undefined, undefined, 'received').deliveryOutcome).toBe(
      'received',
    );
    expect(new BaseAdapterException('b', undefined, undefined, 'not_sent').deliveryOutcome).toBe(
      'not_sent',
    );
  });

  it('is included in toJSON()', () => {
    expect(new ConnectionRefusedException().toJSON()).toMatchObject({
      deliveryOutcome: 'not_sent',
    });
    expect(new HttpException(response, 'x').toJSON()).toMatchObject({
      deliveryOutcome: 'received',
    });
  });

  describe('guards', () => {
    it('read the outcome of adapter exceptions', () => {
      const notSent = new ConnectionRefusedException();
      const unknown = new TimeoutException();
      const received = new HttpException(response, 'x');

      expect([isNotSent(notSent), isDeliveryUnknown(notSent), isReceived(notSent)]).toEqual([
        true,
        false,
        false,
      ]);
      expect([isNotSent(unknown), isDeliveryUnknown(unknown), isReceived(unknown)]).toEqual([
        false,
        true,
        false,
      ]);
      expect([isNotSent(received), isDeliveryUnknown(received), isReceived(received)]).toEqual([
        false,
        false,
        true,
      ]);
    });

    it('read a valid outcome from any object, e.g. another copy of the package', () => {
      expect(getDeliveryOutcome({ deliveryOutcome: 'not_sent' })).toBe('not_sent');
      expect(isNotSent(Object.assign(new Error('x'), { deliveryOutcome: 'not_sent' }))).toBe(true);
    });

    it.each([
      ['a plain Error', new Error('x')],
      ['an invalid outcome', { deliveryOutcome: 'sent' }],
      ['a string', 'boom'],
      ['null', null],
      ['undefined', undefined],
    ])('treat %s as unknown', (_name, value) => {
      expect(getDeliveryOutcome(value)).toBe('unknown');
      expect(isDeliveryUnknown(value)).toBe(true);
      expect(isNotSent(value)).toBe(false);
    });

    it('validate outcome strings', () => {
      expect(isDeliveryOutcome('received')).toBe(true);
      expect(isDeliveryOutcome('sent')).toBe(false);
      expect(isDeliveryOutcome(1)).toBe(false);
    });
  });
});
