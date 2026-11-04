export type Role = 'GM' | 'PLAYER';

export type User = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

export type Campaign = {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
};

export type Membership = {
  campaign: Campaign;
  role: Role;
};

export type Roll = {
  id: number;
  campaignId: number;
  userId: number;
  displayName: string;
  expression: string;
  results: number[];
  modifier: number;
  total: number;
  rolledAt: string;
};

export type Session = {
  user: User;
  token: string;
};

export const LIMITS = {
  email: 254,
  displayName: 40,
  passwordMin: 6,
  passwordMax: 72,
  campaignName: 80,
  campaignDescription: 2000,
  inviteCode: 20,
  expression: 40,
  recentRolls: 20,
} as const;

export const ROUTES = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  campaigns: '/api/campaigns',
  join: '/api/campaigns/join',
  campaign: (id: number) => `/api/campaigns/${id}`,
  inviteCode: (id: number) => `/api/campaigns/${id}/invite-code`,
  rolls: (id: number) => `/api/campaigns/${id}/rolls`,
} as const;

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isRole(value: unknown): value is Role {
  return value === 'GM' || value === 'PLAYER';
}

export function isUser(value: unknown): value is User {
  return isObject(value) && isInteger(value.id) && isText(value.email) && isText(value.displayName) && isText(value.createdAt);
}

function isCampaign(value: unknown): value is Campaign {
  return (
    isObject(value) &&
    isInteger(value.id) &&
    isText(value.name) &&
    isText(value.description) &&
    isText(value.inviteCode) &&
    isText(value.createdAt)
  );
}

function isRoll(value: unknown): value is Roll {
  return (
    isObject(value) &&
    isInteger(value.id) &&
    isInteger(value.campaignId) &&
    isInteger(value.userId) &&
    isText(value.displayName) &&
    isText(value.expression) &&
    Array.isArray(value.results) &&
    value.results.every(isInteger) &&
    isInteger(value.modifier) &&
    isInteger(value.total) &&
    isText(value.rolledAt)
  );
}

function unexpected(what: string): never {
  throw new Error(`The server sent back an unexpected ${what}.`);
}

function readSession(data: unknown): Session {
  if (!isObject(data) || !isUser(data.user) || !isText(data.token)) return unexpected('login response');
  return { user: data.user, token: data.token };
}

function readMembership(data: unknown): Membership {
  if (!isObject(data) || !isCampaign(data.campaign) || !isRole(data.role)) return unexpected('campaign');
  return { campaign: data.campaign, role: data.role };
}

function readCampaign(data: unknown): Campaign {
  if (!isObject(data) || !isCampaign(data.campaign)) return unexpected('campaign');
  return data.campaign;
}

function readCampaignList(data: unknown): Membership[] {
  if (!Array.isArray(data)) return unexpected('campaign list');
  return data.map((item: unknown) => {
    if (!isObject(item)) return unexpected('campaign list');
    const { role } = item;
    if (!isRole(role) || !isCampaign(item)) return unexpected('campaign list');
    const { id, name, description, inviteCode, createdAt } = item;
    return { campaign: { id, name, description, inviteCode, createdAt }, role };
  });
}

function readRoll(data: unknown): Roll {
  if (!isRoll(data)) return unexpected('roll');
  return data;
}

function readRollList(data: unknown): Roll[] {
  if (!Array.isArray(data) || !data.every(isRoll)) return unexpected('roll list');
  return data;
}

async function readBody(response: Response): Promise<unknown> {
  const type = response.headers.get('Content-Type') ?? '';
  if (!type.includes('application/json')) return undefined;
  const body: unknown = await response.json();
  return body;
}

async function send(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
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

export const api = {
  register: (displayName: string, email: string, password: string) =>
    send('POST', ROUTES.register, { email, password, displayName }).then(readSession),
  login: (email: string, password: string) => send('POST', ROUTES.login, { email, password }).then(readSession),
  campaigns: () => send('GET', ROUTES.campaigns).then(readCampaignList),
  campaign: (id: number) => send('GET', ROUTES.campaign(id)).then(readMembership),
  createCampaign: (name: string, description: string) => send('POST', ROUTES.campaigns, { name, description }).then(readMembership),
  joinCampaign: (inviteCode: string) => send('POST', ROUTES.join, { inviteCode }).then(readMembership),
  newInviteCode: (campaignId: number) => send('POST', ROUTES.inviteCode(campaignId)).then(readCampaign),
  rolls: (campaignId: number) => send('GET', `${ROUTES.rolls(campaignId)}?limit=${LIMITS.recentRolls}`).then(readRollList),
  roll: (campaignId: number, expression: string) => send('POST', ROUTES.rolls(campaignId), { expression }).then(readRoll),
};
