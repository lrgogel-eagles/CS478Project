import { isInteger, isObject, isText, unexpected } from '../../api/guards';
import { send } from '../../api/http';

export type User = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

export type Session = {
  user: User;
  token: string;
};

export const AUTH_LIMITS = {
  email: 254,
  displayName: 40,
  passwordMin: 6,
  passwordMax: 72,
} as const;

const ROUTES = {
  register: '/api/auth/register',
  login: '/api/auth/login',
} as const;

export function isUser(value: unknown): value is User {
  return isObject(value) && isInteger(value.id) && isText(value.email) && isText(value.displayName) && isText(value.createdAt);
}

function readSession(data: unknown): Session {
  if (!isObject(data) || !isUser(data.user) || !isText(data.token)) return unexpected('login response');
  return { user: data.user, token: data.token };
}

export const authApi = {
  register: (displayName: string, email: string, password: string) =>
    send('POST', ROUTES.register, { email, password, displayName }).then(readSession),
  login: (email: string, password: string) => send('POST', ROUTES.login, { email, password }).then(readSession),
};
