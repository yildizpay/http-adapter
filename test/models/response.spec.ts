import { Response } from '../../src/models/response';

describe('Response', () => {
  const data = { id: 1, name: 'Test' };
  const status = 200;
  const headers = { 'content-type': 'application/json' };
  const correlationId = 'test-correlation-id';

  it('should initialize with correct values', () => {
    const response = new Response(data, status, headers, correlationId);

    expect(response.data).toEqual(data);
    expect(response.status).toBe(status);
    expect(response.headers).toEqual(headers);
    expect(response.systemCorrelationId).toBe(correlationId);
    expect(response.timestamp).toBeInstanceOf(Date);
  });

  describe('create', () => {
    it('should create instance via static factory method', () => {
      const response = Response.create(data, status, headers, correlationId);

      expect(response).toBeInstanceOf(Response);
      expect(response.data).toEqual(data);
    });
  });

  describe('toDebugObject', () => {
    it('should return correct debug structure', () => {
      const response = new Response(data, status, headers, correlationId);
      const debug = response.toDebugObject();

      expect(debug).toEqual({
        data,
        status,
        headers,
      });
    });
  });
});
