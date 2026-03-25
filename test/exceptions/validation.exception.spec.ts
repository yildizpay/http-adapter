import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { ValidationException } from '../../src/exceptions/validation.exception';
import { Response } from '../../src/models/response';

describe('ValidationException', () => {
  const makeResponse = () =>
    Response.create({ status: 'FAILED', message: 'Insufficient funds' }, 200, null, {
      method: 'POST',
      url: 'https://api.example.com/payments',
      correlationId: 'corr-123',
    });

  it('should set name, message, code, and response', () => {
    const response = makeResponse();
    const exception = new ValidationException('Payment failed', response);

    expect(exception.name).toBe('ValidationException');
    expect(exception.message).toBe('Payment failed');
    expect(exception.code).toBe('ERR_VALIDATION');
    expect(exception.response).toBe(response);
  });

  it('should be an instance of ValidationException and BaseAdapterException', () => {
    const exception = new ValidationException('fail', makeResponse());

    expect(exception).toBeInstanceOf(ValidationException);
    expect(exception).toBeInstanceOf(BaseAdapterException);
  });

  it('should not be retryable', () => {
    const exception = new ValidationException('fail', makeResponse());
    expect(exception.isRetryable()).toBe(false);
  });

  it('should chain cause correctly with default unknown type', () => {
    const cause = new Error('original');
    const exception = new ValidationException('fail', makeResponse(), cause);
    expect(exception.cause).toBe(cause);
  });

  it('should expose typed cause when generic parameter is provided', () => {
    class SchemaError extends Error {
      public readonly issues = [{ message: 'Required field missing' }];
    }
    const schemaError = new SchemaError('schema mismatch');
    const exception = new ValidationException<SchemaError>(
      'Schema validation failed',
      makeResponse(),
      schemaError,
    );

    expect(exception.cause).toBe(schemaError);
    expect(exception.cause?.issues[0].message).toBe('Required field missing');
  });

  it('should have undefined cause when not provided', () => {
    const exception = new ValidationException('fail', makeResponse());
    expect(exception.cause).toBeUndefined();
  });

  it('should serialize to JSON with response details', () => {
    const response = makeResponse();
    const exception = new ValidationException('Payment failed', response);
    const json = exception.toJSON();

    expect(json.name).toBe('ValidationException');
    expect(json.message).toBe('Payment failed');
    expect(json.code).toBe('ERR_VALIDATION');
    expect(json.response).toEqual({
      status: 200,
      data: { status: 'FAILED', message: 'Insufficient funds' },
      request: {
        method: 'POST',
        url: 'https://api.example.com/payments',
        correlationId: 'corr-123',
      },
    });
  });

  it('should be JSON.stringify compatible', () => {
    const exception = new ValidationException('fail', makeResponse());
    expect(() => JSON.stringify(exception)).not.toThrow();
    const parsed = structuredClone(exception.toJSON());
    expect(parsed.name).toBe('ValidationException');
  });
});
