import { resolveToken } from '../../src/auth/token-provider';

describe('resolveToken', () => {
  it('should return the string directly when provider is a static string', async () => {
    expect(await resolveToken('my-token')).toBe('my-token');
  });

  it('should call the function and return its result when provider is a sync function', async () => {
    expect(await resolveToken(() => 'sync-token')).toBe('sync-token');
  });

  it('should await the function and return its result when provider is an async function', async () => {
    expect(await resolveToken(async () => 'async-token')).toBe('async-token');
  });
});
