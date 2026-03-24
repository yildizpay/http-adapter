import { Response } from '../../src/models/response';

describe('Response', () => {
  const data = { id: 1, name: 'Test' };
  const status = 200;
  const headers = { 'content-type': 'application/json' };
  const requestContext = {
    correlationId: 'test-correlation-id',
    method: 'POST',
    url: 'https://api.example.com/pay',
  };

  it('should initialize with correct values', () => {
    const response = Response.create(data, status, headers, requestContext);

    expect(response.data).toEqual(data);
    expect(response.status).toBe(status);
    expect(response.headers).toEqual(headers);
    expect(response.systemCorrelationId).toBe(requestContext.correlationId);
    expect(response.requestContext).toEqual(requestContext);
    expect(response.timestamp).toBeInstanceOf(Date);
  });

  describe('create', () => {
    it('should create instance via static factory method', () => {
      const response = Response.create(data, status, headers, requestContext);

      expect(response).toBeInstanceOf(Response);
      expect(response.data).toEqual(data);
    });

    it('should return empty string for systemCorrelationId when no context provided', () => {
      const response = Response.create(data, status, headers);
      expect(response.systemCorrelationId).toBe('');
    });
  });

  describe('toDebugObject', () => {
    it('should include request context grouped under request key', () => {
      const response = Response.create(data, status, headers, requestContext);
      const debug = response.toDebugObject();

      expect(debug).toEqual({
        status,
        headers,
        data,
        request: requestContext,
      });
    });

    it('should omit request key when no context provided', () => {
      const response = Response.create(data, status, headers);
      const debug = response.toDebugObject();

      expect(debug).toEqual({ status, headers, data });
      expect('request' in debug).toBe(false);
    });
  });
});
