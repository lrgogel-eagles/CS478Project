import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, type To } from 'react-router-dom';
import { HandRing } from '../theme/HandRing';
import { useAuth } from '../features/auth/auth-context';
import { ROLE_LABELS, type Role } from '../features/campaigns/campaigns-api';
import './app-shell.css';

const LONG_NAME = 12;

type ShellCampaign = {
  id: number;
  role: Role;
};

type NavLink = {
  label: string;
  to: To;
  isCurrent: boolean;
};

function campaignLinks(id: number, pathname: string): NavLink[] {
  const home = `/campaigns/${id}`;
  return [
    { label: 'Overview', to: home, isCurrent: pathname === home },
    { label: 'Party', to: { pathname: home, hash: '#party' }, isCurrent: pathname.startsWith(`${home}/characters`) },
    { label: 'Notes', to: { pathname: home, hash: '#notes' }, isCurrent: pathname.startsWith(`${home}/notes`) },
    { label: 'Dice', to: { pathname: home, hash: '#dice' }, isCurrent: false },
    { label: 'Other campaigns', to: '/campaigns', isCurrent: false },
  ];
}

export function AppShell({ campaign, children }: { campaign?: ShellCampaign; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links = campaign ? campaignLinks(campaign.id, pathname) : [{ label: 'Your campaigns', to: '/campaigns', isCurrent: true }];
  const name = user?.displayName ?? '';

  return (
    <div className="table-top">
      <header className="top">
        <Link className="tape tape-logo" to="/campaigns">
          Campaign Keeper
        </Link>
        <nav className="tape tape-nav" aria-label="Pages">
          {links.map((link) => (
            <Link key={link.label} className="hit-area" to={link.to} aria-current={link.isCurrent ? 'page' : undefined}>
              {link.label}
              {link.isCurrent && <HandRing />}
            </Link>
          ))}
        </nav>
        <div className="name-tag">
          <span className="name-tag-head">
            <b>Hello</b> my name is
          </span>
          <span className="name-tag-name" data-long={name.length > LONG_NAME ? 'true' : undefined}>
            {name}
          </span>
          <span className="name-tag-foot">
            {campaign && <span>{ROLE_LABELS[campaign.role]}</span>}
            <button
              type="button"
              className="pencil-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Log out
            </button>
          </span>
        </div>
      </header>
      <main className="table-main">{children}</main>
    </div>
  );
}
