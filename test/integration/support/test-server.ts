import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

/**
 * A request as received by the test server, captured before any handler runs.
 */
export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
  bodyText: string;
}

export type RouteHandler = (request: RecordedRequest, res: ServerResponse) => void | Promise<void>;

/**
 * A real HTTP server on an ephemeral localhost port for integration tests.
 *
 * Every request is recorded in `requests`. Routes are matched by exact path; unmatched
 * paths echo the recorded request back as JSON with status 200.
 */
export class TestServer {
  public readonly requests: RecordedRequest[] = [];
  private readonly routes = new Map<string, RouteHandler>();

  private constructor(
    private readonly server: Server,
    public readonly baseUrl: string,
  ) {}

  public static async start(): Promise<TestServer> {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const instance = new TestServer(server, `http://127.0.0.1:${port}`);
    server.on('request', (req, res) => void instance.handle(req, res));
    return instance;
  }

  public route(path: string, handler: RouteHandler): this {
    this.routes.set(path, handler);
    return this;
  }

  public requestsTo(path: string): RecordedRequest[] {
    return this.requests.filter((r) => r.path === path);
  }

  public get lastRequest(): RecordedRequest {
    const last = this.requests[this.requests.length - 1];
    if (!last) throw new Error('TestServer: no requests received');
    return last;
  }

  public reset(): void {
    this.requests.length = 0;
    this.routes.clear();
  }

  public async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      this.server.close((err) => (err ? reject(err) : resolve())),
    );
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const url = new URL(req.url ?? '/', 'http://localhost');

    const recorded: RecordedRequest = {
      method: req.method ?? '',
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers,
      body,
      bodyText: body.toString('utf8'),
    };
    this.requests.push(recorded);

    const handler = this.routes.get(url.pathname) ?? echo;
    try {
      await handler(recorded, res);
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  }
}

/** Responds with the recorded request as JSON. */
export const echo: RouteHandler = (request, res) => {
  json(res, 200, {
    method: request.method,
    path: request.path,
    query: request.query,
    headers: request.headers,
    body: request.bodyText,
  });
};

export function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

/** Responds with `status` and a JSON body, optionally with extra headers such as Retry-After. */
export function status(code: number, headers: Record<string, string> = {}): RouteHandler {
  return (_request, res) => json(res, code, { status: code }, headers);
}

/** Waits `ms` before echoing; used to trigger client timeouts. */
export function delay(ms: number, then: RouteHandler = echo): RouteHandler {
  return async (request, res) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    if (!res.destroyed) await then(request, res);
  };
}

/** Destroys the socket without writing a response (ECONNRESET / "other side closed"). */
export const resetBeforeHeaders: RouteHandler = (_request, res) => {
  res.socket?.destroy();
};

/** Writes headers and part of the body, then destroys the socket. */
export const resetAfterHeaders: RouteHandler = (_request, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'content-length': '100' });
  res.write('{"partial":');
  setImmediate(() => res.socket?.destroy());
};

/** Responds with `text` encoded as latin5 (iso-8859-9) and the matching charset. */
export function latin5Text(text: string): RouteHandler {
  return (_request, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=iso-8859-9' });
    res.end(encodeLatin5(text));
  };
}

const LATIN5_OVERRIDES: Record<string, number> = {
  Ğ: 0xd0,
  İ: 0xdd,
  Ş: 0xde,
  ğ: 0xf0,
  ı: 0xfd,
  ş: 0xfe,
};

function encodeLatin5(text: string): Buffer {
  return Buffer.from(Array.from(text, (ch) => LATIN5_OVERRIDES[ch] ?? ch.charCodeAt(0) & 0xff));
}

/** Returns a localhost URL on which nothing is listening (connection refused). */
export async function refusedUrl(): Promise<string> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}

/** A host that can never resolve (RFC 6761 reserves `.invalid`). */
export const UNRESOLVABLE_URL = 'http://does-not-exist.invalid';
