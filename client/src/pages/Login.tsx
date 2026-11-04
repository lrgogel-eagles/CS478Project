import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorText, LIMITS } from '../api/client';
import { useAuth } from '../auth';

type Tab = 'login' | 'register';

export function Login() {
  const [tab, setTab] = useState<Tab>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  function switchTo(next: Tab) {
    setTab(next);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const session = tab === 'login' ? await api.login(email.trim(), password) : await api.register(displayName.trim(), email.trim(), password);
      auth.login(session.token, session.user);
      navigate('/campaigns');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card shadow-sm mx-auto" style={{ maxWidth: 460 }}>
      <div className="card-body p-4">
        <h1 className="h3 text-center mb-4">Welcome to Campaign Keeper</h1>
        <div className="nav nav-tabs mb-4" role="tablist">
          <button role="tab" aria-selected={tab === 'login'} className={'nav-link ' + (tab === 'login' ? 'active' : '')} onClick={() => switchTo('login')}>
            Log in
          </button>
          <button
            role="tab"
            aria-selected={tab === 'register'}
            className={'nav-link ' + (tab === 'register' ? 'active' : '')}
            onClick={() => switchTo('register')}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={submit}>
          {tab === 'register' && (
            <div className="mb-3">
              <label htmlFor="displayName" className="form-label">
                Display name
              </label>
              <input
                id="displayName"
                className="form-control"
                value={displayName}
                maxLength={LIMITS.displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              maxLength={LIMITS.email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              minLength={LIMITS.passwordMin}
              maxLength={LIMITS.passwordMax}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && (
            <div role="alert" className="alert alert-danger text-break">
              {error}
            </div>
          )}
          <button disabled={isLoading} className="btn btn-primary w-100" type="submit">
            {isLoading ? 'Please wait...' : tab === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
