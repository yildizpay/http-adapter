import { HttpAdapter } from '../../src/core/http.adapter';
import { RequestBuilder } from '../../src/builders/request.builder';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { RetryPolicies } from '../../src/resilience/retry.policies';
import { BaseAdapterException } from '../../src/exceptions/base-adapter.exception';
import {
  NotFoundException,
  InternalServerErrorException,
} from '../../src/exceptions/http-status.exceptions';
import {
  ConnectionRefusedException,
  DnsResolutionException,
  NetworkException,
  SocketResetException,
  TimeoutException,
} from '../../src/exceptions/network.exceptions';
import {
  TestServer,
  delay,
  json,
  refusedUrl,
  resetAfterHeaders,
  resetBeforeHeaders,
  status,
  UNRESOLVABLE_URL,
} from './support/test-server';

/**
 * End-to-end tests against a real HTTP server using the default fetch client.
 *
 * Tests marked `it.failing` document known bugs; each fix flips its test to `it`.
 */
describe('HttpAdapter (integration)', () => {
  let server: TestServer;
  let adapter: HttpAdapter;

  beforeAll(async () => {
    server = await TestServer.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
    adapter = HttpAdapter.builder().build();
  });

  const request = (baseUrl = server.baseUrl) => new RequestBuilder(baseUrl);

  async function sendAndCatch(req = request().setEndpoint('/').build(), target = adapter) {
    try {
      await target.send(req);
    } catch (error) {
      return error;
    }
    throw new Error('Expected the request to fail');
  }

  describe('baseline', () => {
    it('sends a GET request and parses the JSON response', async () => {
      const response = await adapter.send<{ method: string; path: string }>(
        request().setEndpoint('/users').setMethod(HttpMethod.GET).build(),
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({ method: 'GET', path: '/users' });
    });

    it('sends a JSON body with POST', async () => {
      await adapter.send(request().setEndpoint('/pay').setBody({ amount: '10.00' }).build());

      expect(server.lastRequest.method).toBe('POST');
      expect(JSON.parse(server.lastRequest.bodyText)).toEqual({ amount: '10.00' });
    });

    it('maps error statuses to typed exceptions with the response body', async () => {
      server.route('/missing', (_req, res) => json(res, 404, { error: 'not found' }));

      const error = await sendAndCatch(request().setEndpoint('/missing').build());

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).response.data).toEqual({ error: 'not found' });
    });

    // Under Jest the abort DOMException comes from another realm and fails `instanceof Error` (#34).
    it.failing('throws TimeoutException when the server is slower than the timeout', async () => {
      server.route('/slow', delay(500));

      const error = await sendAndCatch(request().setEndpoint('/slow').setTimeout(50).build());

      expect(error).toBeInstanceOf(TimeoutException);
    });
  });

  describe('network error classification (#34)', () => {
    it.failing('classifies a refused connection as ConnectionRefusedException', async () => {
      const error = await sendAndCatch(
        request(await refusedUrl())
          .setEndpoint('/')
          .build(),
      );

      expect(error).toBeInstanceOf(ConnectionRefusedException);
      expect((error as ConnectionRefusedException).code).toBe('ECONNREFUSED');
    });

    it.failing('classifies an unresolvable host as DnsResolutionException', async () => {
      const error = await sendAndCatch(request(UNRESOLVABLE_URL).setEndpoint('/').build());

      expect(error).toBeInstanceOf(DnsResolutionException);
    });

    it.failing(
      'classifies a socket closed before the response as SocketResetException',
      async () => {
        server.route('/reset', resetBeforeHeaders);

        const error = await sendAndCatch(request().setEndpoint('/reset').build());

        expect(error).toBeInstanceOf(SocketResetException);
      },
    );

    it.failing('fails when the connection drops while reading the body (#64)', async () => {
      server.route('/truncated', resetAfterHeaders);

      const error = await sendAndCatch(request().setEndpoint('/truncated').build());

      expect(error).toBeInstanceOf(NetworkException);
    });

    it('does not retry a POST whose connection was reset', async () => {
      server.route('/reset', resetBeforeHeaders);
      const retrying = HttpAdapter.builder()
        .withRetryPolicy(RetryPolicies.fixedDelay(3, 1))
        .build();

      await sendAndCatch(request().setEndpoint('/reset').build(), retrying);

      expect(server.requestsTo('/reset')).toHaveLength(1);
    });
  });

  describe('request context on errors (#35)', () => {
    it.failing('attaches method, url and correlation id to HTTP errors', async () => {
      server.route('/boom', status(500));
      const req = request().setEndpoint('/boom').build();

      const error = (await sendAndCatch(req)) as InternalServerErrorException;

      expect(error.response.requestContext).toEqual({
        method: 'POST',
        url: `${server.baseUrl}/boom`,
        correlationId: req.systemCorrelationId,
      });
    });

    it.failing('attaches request context to network errors', async () => {
      const baseUrl = await refusedUrl();

      const error = (await sendAndCatch(
        request(baseUrl).setEndpoint('/x').build(),
      )) as NetworkException;

      expect(error.requestContext?.url).toBe(`${baseUrl}/x`);
    });
  });

  describe('body serialization (#36)', () => {
    it.failing('encodes form bodies as application/x-www-form-urlencoded', async () => {
      await adapter.send(
        request().setEndpoint('/form').asFormUrlEncoded().setBody({ a: '1', b: 'x y' }).build(),
      );

      expect(server.lastRequest.bodyText).toBe('a=1&b=x+y');
    });
  });

  describe('URL building (#37)', () => {
    it.failing('keeps the base URL path', async () => {
      await adapter.send(request(`${server.baseUrl}/v1`).setEndpoint('/users').build());

      expect(server.lastRequest.path).toBe('/v1/users');
    });
  });

  describe('request isolation (#38)', () => {
    it('does not share headers between requests built from the same builder', async () => {
      const builder = request().setEndpoint('/a');
      const first = builder.build();
      const second = builder.build();

      first.addHeader('Authorization', 'Bearer user-1');

      expect(second.headers.Authorization).toBeUndefined();
    });
  });

  describe('empty bodies (#39)', () => {
    it('sends DELETE without a body when none was set', async () => {
      await adapter.send(request().setEndpoint('/items/1').setMethod(HttpMethod.DELETE).build());

      expect(server.lastRequest.bodyText).toBe('');
    });

    it('still sends an explicit DELETE body', async () => {
      await adapter.send(
        request().setEndpoint('/items/1').setMethod(HttpMethod.DELETE).setBody({ a: 1 }).build(),
      );

      expect(server.lastRequest.bodyText).toBe('{"a":1}');
    });
  });

  describe('request interceptor errors (#40)', () => {
    it.failing('converts errors thrown by request interceptors', async () => {
      const failing = HttpAdapter.builder()
        .withInterceptor({
          onRequest: async () => {
            throw new Error('token provider failed');
          },
        })
        .build();

      const error = await sendAndCatch(request().setEndpoint('/').build(), failing);

      expect(error).toBeInstanceOf(BaseAdapterException);
    });
  });

  describe('response parsing (#41)', () => {
    it.failing('parses application/problem+json as JSON', async () => {
      server.route('/problem', (_req, res) => {
        res.writeHead(400, { 'content-type': 'application/problem+json' });
        res.end(JSON.stringify({ title: 'Invalid card' }));
      });

      const error = (await sendAndCatch(
        request().setEndpoint('/problem').build(),
      )) as NotFoundException;

      expect(error.response.data).toEqual({ title: 'Invalid card' });
    });
  });

  describe('headers (#42)', () => {
    it('does not send Content-Type on a GET without a body', async () => {
      await adapter.send(request().setEndpoint('/').setMethod(HttpMethod.GET).build());

      expect(server.lastRequest.headers['content-type']).toBeUndefined();
    });

    it('lets a lowercase content-type override the default', async () => {
      await adapter.send(
        request().setEndpoint('/').addHeader('content-type', 'text/plain').setBody({}).build(),
      );

      expect(server.lastRequest.headers['content-type']).toBe('text/plain');
    });
  });

  it.todo('honors Retry-After between retries (#51)');
  it.todo('decodes iso-8859-9 responses (#53)');
});
