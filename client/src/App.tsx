import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Campaigns } from './pages/Campaigns';
import { Dice } from './pages/Dice';
import { Login } from './pages/Login';

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function Nav() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="navbar navbar-dark bg-dark px-4">
      <Link className="navbar-brand" to="/">
        Campaign Keeper
      </Link>
      {isAuthenticated && (
        <div className="d-flex gap-3 align-items-center">
          <Link className="text-white" to="/campaigns">
            Campaigns
          </Link>
          <span className="text-white-50 text-break">{user?.displayName}</span>
          <button
            className="btn btn-outline-light btn-sm text-nowrap"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}

function Pages() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <Nav />
      <main className="container py-4">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/campaigns" replace /> : <Login />} />
          <Route
            path="/campaigns"
            element={
              <Protected>
                <Campaigns />
              </Protected>
            }
          />
          <Route
            path="/campaigns/:campaignId/dice"
            element={
              <Protected>
                <Dice />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/campaigns' : '/login'} replace />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Pages />
      </BrowserRouter>
    </AuthProvider>
  );
}
