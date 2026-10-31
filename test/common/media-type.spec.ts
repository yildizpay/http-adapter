import { describe, it, expect } from 'vitest';
import { isJsonMediaType, mediaTypeOf } from '../../src/common/utils/media-type';

describe('media type helpers', () => {
  it('mediaTypeOf strips parameters and lowercases', () => {
    expect(mediaTypeOf(' Application/JSON ; charset=utf-8')).toBe('application/json');
  });

  it.each([
    ['application/json', true],
    ['application/problem+json', true],
    ['text/plain', false],
    ['application/jsonp', false],
  ])('isJsonMediaType(%s) is %s', (mediaType, expected) => {
    expect(isJsonMediaType(mediaType)).toBe(expected);
  });
});
