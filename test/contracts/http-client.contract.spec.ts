import { HttpClientException } from '../../src/contracts/http-client.contract';

describe('HttpClientException', () => {
  it('should create an instance with message and default properties', () => {
    const exception = new HttpClientException('Test error');
    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('HttpClientException');
    expect(exception.message).toBe('Test error');
    expect(exception.response).toBeUndefined();
    expect(exception.code).toBeUndefined();
  });

  it('should initialize response when status is provided', () => {
    const exception = new HttpClientException(
      'Test error',
      500,
      { detailed: true },
      { 'x-req': '123' },
      'TIMEOUT',
    );
    expect(exception.response).toBeDefined();
    expect(exception.response?.status).toBe(500);
    expect(exception.response?.data).toEqual({ detailed: true });
    expect(exception.response?.headers).toEqual({ 'x-req': '123' });
    expect(exception.code).toBe('TIMEOUT');
  });

  it('should provide empty object for headers if missing but status is present', () => {
    const exception = new HttpClientException('Test error', 400, 'bad req');
    expect(exception.response?.status).toBe(400);
    expect(exception.response?.headers).toEqual({});
    expect(exception.response?.data).toBe('bad req');
  });
});
