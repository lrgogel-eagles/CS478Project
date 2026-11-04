import { createContext, useContext, useState, type ReactNode } from 'react';
import { getToken, setToken } from '../../api/http';
import { isUser, type User } from './auth-api';

export const USER_KEY = 'ck_user';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function storedUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  return isUser(value) ? value : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storedUser);

  const login = (token: string, next: User) => {
    setToken(token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  };

  const logout = () => {
    setToken(null);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const isAuthenticated = user !== null && getToken() !== null;
  return <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth needs an AuthProvider above it');
  return value;
}
