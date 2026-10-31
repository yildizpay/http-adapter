import { deleteHeader, findHeaderKey, setHeader } from '../../src/common/utils/headers';

describe('header helpers', () => {
  it('findHeaderKey matches regardless of case', () => {
    expect(findHeaderKey({ 'content-TYPE': 'x' }, 'Content-Type')).toBe('content-TYPE');
    expect(findHeaderKey({ Accept: 'x' }, 'Content-Type')).toBeUndefined();
  });

  it('setHeader replaces an entry spelled differently', () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    setHeader(headers, 'content-type', 'text/plain');

    expect(headers).toEqual({ 'content-type': 'text/plain' });
  });

  it('deleteHeader removes every spelling', () => {
    const headers: Record<string, string> = { 'X-A': '1', 'x-a': '2', 'X-B': '3' };

    deleteHeader(headers, 'x-A');

    expect(headers).toEqual({ 'X-B': '3' });
  });
});
