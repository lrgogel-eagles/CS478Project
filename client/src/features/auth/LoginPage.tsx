import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorText } from '../../api/http';
import { DieIcon } from '../dice/DieIcon';
import { AUTH_LIMITS, authApi } from './auth-api';
import { useAuth } from './auth-context';
import './login.css';

type Mode = 'login' | 'register';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'login', label: 'Log in' },
  { mode: 'register', label: 'Sign up' },
];

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ login: null, register: null });
  const auth = useAuth();
  const navigate = useNavigate();

  function switchTo(next: Mode) {
    setMode(next);
    setError('');
  }

  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next: Mode = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : mode === 'login' ? 'register' : 'login';
    switchTo(next);
    tabRefs.current[next]?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const session = mode === 'login' ? await authApi.login(email.trim(), password) : await authApi.register(displayName.trim(), email.trim(), password);
      auth.login(session.token, session.user);
      navigate('/campaigns');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="table-top login-page">
      <div className="login-stack">
        <h1 className="tape login-logo">Campaign Keeper</h1>
        <p className="on-wood-note login-tagline">Character sheets, session notes and dice for your group.</p>
        <div className="login-folder">
          <div className="login-tabs" role="tablist" aria-label="Log in or sign up" onKeyDown={moveTab}>
            {MODES.map((item) => (
              <button
                key={item.mode}
                ref={(element) => {
                  tabRefs.current[item.mode] = element;
                }}
                type="button"
                role="tab"
                id={`tab-${item.mode}`}
                className="login-tab"
                aria-selected={mode === item.mode}
                aria-controls="login-panel"
                tabIndex={mode === item.mode ? 0 : -1}
                onClick={() => switchTo(item.mode)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <form id="login-panel" className="login-card" role="tabpanel" aria-labelledby={`tab-${mode}`} onSubmit={submit}>
            {mode === 'register' && (
              <div className="login-field">
                <label htmlFor="displayName" className="field-label">
                  Display name
                </label>
                <input
                  id="displayName"
                  className="pencil-input"
                  value={displayName}
                  maxLength={AUTH_LIMITS.displayName}
                  autoComplete="nickname"
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="login-field">
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="pencil-input"
                value={email}
                maxLength={AUTH_LIMITS.email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="pencil-input"
                value={password}
                minLength={AUTH_LIMITS.passwordMin}
                maxLength={AUTH_LIMITS.passwordMax}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-describedby={mode === 'register' ? 'passwordHint' : undefined}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {mode === 'register' && (
                <span id="passwordHint" className="login-hint">
                  At least {AUTH_LIMITS.passwordMin} characters.
                </span>
              )}
            </div>
            {error && (
              <p role="alert" className="paper-alert">
                {error}
              </p>
            )}
            <button disabled={isLoading} className="ink-btn login-submit" type="submit">
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
        <DieIcon kind="d20" value="20" className="login-die login-die-d20" />
        <DieIcon kind="d6" value="4" className="login-die login-die-d6" />
      </div>
    </div>
  );
}
