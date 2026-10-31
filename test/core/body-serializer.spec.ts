import { describe, expect, it } from 'vitest';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import type { HttpClientRequestConfig } from '../../src/contracts/http-client.contract';
import { serializeRequestBody } from '../../src/core/body-serializer';

describe('serializeRequestBody', () => {
  const config = (overrides: Partial<HttpClientRequestConfig>): HttpClientRequestConfig => ({
    url: 'https://api.example.com',
    method: HttpMethod.POST,
    ...overrides,
  });

  it('never serializes a body for GET and HEAD', () => {
    expect(
      serializeRequestBody(config({ method: HttpMethod.GET, data: { a: 1 } })),
    ).toBeUndefined();
    expect(serializeRequestBody(config({ method: HttpMethod.HEAD, rawBody: 'x' }))).toBeUndefined();
  });

  it('sends a raw body as-is, ahead of data', () => {
    expect(serializeRequestBody(config({ rawBody: '<x/>', data: { a: 1 } }))).toBe('<x/>');
  });

  it('returns undefined without data', () => {
    expect(serializeRequestBody(config({ data: null }))).toBeUndefined();
  });

  it('skips an empty body for DELETE but sends "{}" for POST', () => {
    expect(serializeRequestBody(config({ method: HttpMethod.DELETE, data: {} }))).toBeUndefined();
    expect(serializeRequestBody(config({ data: {} }))).toBe('{}');
  });

  it('defaults to JSON without a Content-Type', () => {
    expect(serializeRequestBody(config({ data: { a: 1 } }))).toBe('{"a":1}');
  });

  it.each(['application/json; charset=utf-8', 'application/problem+json', 'APPLICATION/JSON'])(
    'encodes JSON for %s',
    (contentType) => {
      expect(
        serializeRequestBody(config({ headers: { 'content-type': contentType }, data: { a: 1 } })),
      ).toBe('{"a":1}');
    },
  );

  it('form-urlencodes flat objects and skips null/undefined values', () => {
    const body = serializeRequestBody(
      config({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
        data: { a: 1, b: 'x y&z', c: true, d: null, e: undefined },
      }),
    );

    expect(body).toBe('a=1&b=x+y%26z&c=true');
  });

  it('rejects nested objects for form encoding', () => {
    expect(() =>
      serializeRequestBody(
        config({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: { card: { number: '4111' } },
        }),
      ),
    ).toThrow(/nested object at "card"/);
  });

  it('rejects object bodies for other media types', () => {
    expect(() =>
      serializeRequestBody(config({ headers: { 'Content-Type': 'text/xml' }, data: { a: 1 } })),
    ).toThrow(/setRawBody/);
  });
});
