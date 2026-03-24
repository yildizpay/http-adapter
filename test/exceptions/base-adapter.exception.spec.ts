import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import { UnknownException } from '../../src/exceptions/unknown.exception';

class ConcreteException extends BaseAdapterException {
  constructor(message: string, code?: string, cause?: unknown) {
    super(message, code, cause);
    this.name = 'ConcreteException';
    Object.setPrototypeOf(this, ConcreteException.prototype);
  }
}

describe('BaseAdapterException', () => {
  describe('construction', () => {
    it('sets message, name, code, and cause correctly', () => {
      const cause = new Error('root cause');
      const error = new ConcreteException('Something failed', 'ERR_CODE', cause);

      expect(error.message).toBe('Something failed');
      expect(error.name).toBe('ConcreteException');
      expect(error.code).toBe('ERR_CODE');
      expect(error.cause).toBe(cause);
    });

    it('works without optional fields', () => {
      const error = new ConcreteException('Minimal');

      expect(error.message).toBe('Minimal');
      expect(error.code).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('is an instance of Error', () => {
      expect(new ConcreteException('test')).toBeInstanceOf(Error);
    });

    it('preserves instanceof across prototype chain', () => {
      const error = new ConcreteException('test');

      expect(error).toBeInstanceOf(BaseAdapterException);
      expect(error).toBeInstanceOf(ConcreteException);
    });
  });

  describe('isRetryable', () => {
    it('returns false by default', () => {
      expect(new ConcreteException('test').isRetryable()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('includes name, message, and stack', () => {
      const error = new ConcreteException('Something failed');
      const json = error.toJSON();

      expect(json.name).toBe('ConcreteException');
      expect(json.message).toBe('Something failed');
      expect(json.stack).toBeDefined();
    });

    it('includes code when set', () => {
      const error = new ConcreteException('Failed', 'ERR_CODE');
      const json = error.toJSON();

      expect(json.code).toBe('ERR_CODE');
    });

    it('omits code when not set', () => {
      const error = new ConcreteException('Failed');
      const json = error.toJSON();

      expect('code' in json).toBe(false);
    });

    it('serializes Error cause with name, message, and stack', () => {
      const cause = new Error('root cause');
      const error = new ConcreteException('Outer', undefined, cause);
      const json = error.toJSON() as { cause: Record<string, unknown> };

      expect(json.cause).toMatchObject({
        name: 'Error',
        message: 'root cause',
      });
      expect(json.cause.stack).toBeDefined();
    });

    it('serializes BaseAdapterException cause recursively', () => {
      const inner = new UnknownException('Inner failure');
      const outer = new ConcreteException('Outer failure', undefined, inner);
      const json = outer.toJSON() as { cause: Record<string, unknown> };

      expect(json.cause).toMatchObject({ name: 'UnknownException', message: 'Inner failure' });
    });

    it('omits cause when not set', () => {
      const error = new ConcreteException('No cause');
      const json = error.toJSON();

      expect('cause' in json).toBe(false);
    });

    it('preserves non-Error cause as-is', () => {
      const cause = { customField: 'raw error' };
      const error = new ConcreteException('Custom cause', undefined, cause);
      const json = error.toJSON() as { cause: unknown };

      expect(json.cause).toBe(cause);
    });

    it('is JSON.stringify compatible', () => {
      const error = new ConcreteException('Serializable', 'ERR', new Error('cause'));

      expect(() => JSON.stringify(error)).not.toThrow();
      const parsed = JSON.parse(JSON.stringify(error));
      expect(parsed.name).toBe('ConcreteException');
      expect(parsed.message).toBe('Serializable');
      expect(parsed.code).toBe('ERR');
      expect(parsed.cause.message).toBe('cause');
    });
  });
});
