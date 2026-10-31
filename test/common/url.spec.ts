import { joinUrl } from '../../src/common/utils/url';

describe('joinUrl', () => {
  it.each([
    ['https://api.example.com', '/users', 'https://api.example.com/users'],
    ['https://api.example.com/', '/users', 'https://api.example.com/users'],
    ['https://api.example.com/v1', '/users', 'https://api.example.com/v1/users'],
    ['https://api.example.com/v1', 'users', 'https://api.example.com/v1/users'],
    ['https://api.example.com/v1/', '/users', 'https://api.example.com/v1/users'],
    ['https://api.example.com/v1//', '//users', 'https://api.example.com/v1/users'],
    ['https://api.example.com/v1', '', 'https://api.example.com/v1'],
    ['https://api.example.com/v1', '/users/', 'https://api.example.com/v1/users/'],
  ])('%s + %s → %s', (base, endpoint, expected) => {
    expect(joinUrl(base, endpoint).toString()).toBe(expected);
  });

  it('keeps a query string on the endpoint and on the base', () => {
    expect(joinUrl('https://api.example.com/v1?tenant=a', '/users?page=2').toString()).toBe(
      'https://api.example.com/v1/users?tenant=a&page=2',
    );
  });

  it('keeps a fragment', () => {
    expect(joinUrl('https://api.example.com', '/docs#top').toString()).toBe(
      'https://api.example.com/docs#top',
    );
  });

  it('uses an absolute endpoint as-is', () => {
    expect(joinUrl('https://api.example.com/v1', 'https://other.example.com/x').toString()).toBe(
      'https://other.example.com/x',
    );
  });
});
