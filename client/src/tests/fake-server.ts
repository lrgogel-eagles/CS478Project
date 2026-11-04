import { vi } from 'vitest';

type Method = 'GET' | 'POST' | 'PATCH';

export type FakeRequest = {
  method: Method;
  path: string;
  query: URLSearchParams;
  params: string[];
  body: unknown;
  authorization: string | null;
};

type Handler = (request: FakeRequest) => unknown;

type Route = {
  method: Method;
  pattern: RegExp;
  handler: Handler;
};

export class FakeReply {
  constructor(
    readonly status: number,
    readonly body: unknown
  ) {}
}

export function failWith(status: number, error: string) {
  return new FakeReply(status, { error });
}

function toPattern(path: string) {
  return new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`);
}

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body ?? null), { status, headers: { 'Content-Type': 'application/json' } });
}

function isMethod(value: string): value is Method {
  return value === 'GET' || value === 'POST' || value === 'PATCH';
}

export function fakeServer() {
  const routes: Route[] = [];
  const requests: FakeRequest[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(String(input), 'http://localhost');
      const method = init.method ?? 'GET';
      if (!isMethod(method)) return respond(405, { error: `The fake server can't handle ${method}` });
      const route = [...routes].reverse().find((entry) => entry.method === method && entry.pattern.test(url.pathname));
      if (!route) return respond(501, { error: `No fake route for ${method} ${url.pathname}` });
      const request: FakeRequest = {
        method,
        path: url.pathname,
        query: url.searchParams,
        params: route.pattern.exec(url.pathname)?.slice(1) ?? [],
        body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
        authorization: new Headers(init.headers).get('Authorization'),
      };
      requests.push(request);
      const reply = await route.handler(request);
      return reply instanceof FakeReply ? respond(reply.status, reply.body) : respond(method === 'POST' ? 201 : 200, reply);
    })
  );

  return {
    requests,
    on(method: Method, path: string, handler: Handler) {
      routes.push({ method, pattern: toPattern(path), handler });
    },
    sent(method: Method, path: string) {
      const pattern = toPattern(path);
      return requests.filter((request) => request.method === method && pattern.test(request.path));
    },
  };
}

export type FakeServer = ReturnType<typeof fakeServer>;
