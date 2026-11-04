import { isObject, isText } from './guards';

const TOKEN_KEY = 'ck_token';
const TIMEOUT_MS = 10_000;

let token = sessionStorage.getItem(TOKEN_KEY);

export function setToken(value: string | null) {
  token = value;
  if (value) sessionStorage.setItem(TOKEN_KEY, value);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return token;
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function readBody(response: Response): Promise<unknown> {
  const type = response.headers.get('Content-Type') ?? '';
  if (!type.includes('application/json')) return undefined;
  const body: unknown = await response.json();
  return body;
}

export async function send(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<unknown> {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((cause: unknown) => {
    throw new Error("Couldn't reach the server. Check that it's running.", { cause });
  });
  const data = await readBody(response);
  if (!response.ok) {
    throw new Error(isObject(data) && isText(data.error) ? data.error : `Request failed (${response.status})`);
  }
  return data;
}
