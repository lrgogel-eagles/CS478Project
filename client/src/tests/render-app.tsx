import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { setToken } from '../api/http';
import { AppRoutes, ROUTER_FUTURE } from '../app/App';
import type { User } from '../features/auth/auth-api';
import { AuthProvider, USER_KEY } from '../features/auth/auth-context';
import type { Member, Role } from '../features/campaigns/campaigns-api';
import type { Character } from '../features/characters/characters-api';
import type { Roll } from '../features/dice/dice-api';
import type { SessionNote } from '../features/notes/notes-api';
import type { FakeServer } from './fake-server';
import { makeCampaign, makeMember, mira, sam } from './fixtures';

export function signIn(user: User) {
  setToken(`token-for-${user.id}`);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.hash}`}</output>;
}

export function renderApp(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>
  );
}

export function currentLocation() {
  return screen.getByTestId('location').textContent;
}

type TableSetup = {
  role?: Role;
  name?: string;
  description?: string;
  inviteCode?: string;
  members?: Member[];
  characters?: Character[];
  notes?: SessionNote[];
  rolls?: Roll[];
};

export function serveTable(server: FakeServer, setup: TableSetup = {}) {
  const campaign = makeCampaign(7, setup.name ?? 'The Sunken Keep', {
    description: setup.description ?? 'A flooded fortress on the coast.',
    inviteCode: setup.inviteCode ?? 'KEEP42',
  });
  const members = setup.members ?? [makeMember(mira, 'GM'), makeMember(sam, 'PLAYER')];
  server.on('GET', '/api/campaigns/:id', () => ({ campaign, role: setup.role ?? 'GM' }));
  server.on('GET', '/api/campaigns/:id/members', () => members);
  server.on('GET', '/api/campaigns/:id/characters', () => setup.characters ?? []);
  server.on('GET', '/api/campaigns/:id/notes', () => setup.notes ?? []);
  server.on('GET', '/api/campaigns/:id/rolls', () => setup.rolls ?? []);
  return campaign;
}
