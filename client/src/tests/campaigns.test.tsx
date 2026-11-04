import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPAIGN_LIMITS, type Membership } from '../features/campaigns/campaigns-api';
import { failWith, fakeServer, type FakeServer } from './fake-server';
import { makeCampaign, makeMembership, mira } from './fixtures';
import { renderApp, signIn } from './render-app';

const user = userEvent.setup({ delay: null });

const dragonQuest = makeMembership(makeCampaign(1, 'Dragon Quest', { inviteCode: 'DRAGON' }), 'GM');
const sunkenKeep = makeMembership(makeCampaign(7, 'The Sunken Keep', { inviteCode: 'KEEP42', description: 'A flooded fortress on the coast.' }), 'PLAYER');

function pinFor(name: string) {
  const list = screen.getByRole('list', { name: 'Your campaigns' });
  const pin = within(list)
    .getAllByRole('listitem')
    .find((item) => within(item).queryByRole('heading', { name }) !== null);
  if (!pin) throw new Error(`No campaign pin named ${name}`);
  return pin;
}

describe('Campaign list', () => {
  let server: FakeServer;
  let memberships: Membership[];

  beforeEach(() => {
    server = fakeServer();
    memberships = [];
    server.on('GET', '/api/campaigns', () => memberships.map(({ campaign, role }) => ({ ...campaign, role })));
    signIn(mira);
  });

  it('pins up each campaign with your role and a way in', async () => {
    memberships = [dragonQuest, sunkenKeep];
    renderApp('/campaigns');
    await screen.findByRole('list', { name: 'Your campaigns' });
    expect(within(pinFor('Dragon Quest')).getByText('Game Master')).toBeInTheDocument();
    expect(within(pinFor('The Sunken Keep')).getByText('Player')).toBeInTheDocument();
    expect(within(pinFor('The Sunken Keep')).getByText('A flooded fortress on the coast.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open The Sunken Keep' })).toHaveAttribute('href', '/campaigns/7');
    expect(screen.getByRole('link', { name: 'Dragon Quest' })).toHaveAttribute('href', '/campaigns/1');
  });

  it('leaves a note when you have no campaigns yet', async () => {
    renderApp('/campaigns');
    expect(await screen.findByText('No campaigns yet. Start one below, or ask your Game Master for an invite code.')).toBeInTheDocument();
  });

  it('shows the server error when the list fails', async () => {
    server.on('GET', '/api/campaigns', () => failWith(500, 'Database is down'));
    renderApp('/campaigns');
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down');
  });

  it('starts a campaign with a trimmed name and description', async () => {
    server.on('POST', '/api/campaigns', () => makeMembership(makeCampaign(2, 'New World', { description: 'Pirates and sea monsters.' }), 'GM'));
    renderApp('/campaigns');
    await screen.findByText(/No campaigns yet/);
    await user.type(screen.getByLabelText('Campaign name'), '  New World ');
    await user.type(screen.getByLabelText("What's it about? (optional)"), ' Pirates and sea monsters. ');
    await user.click(screen.getByRole('button', { name: 'Start it' }));
    expect(await screen.findByRole('heading', { name: 'New World' })).toBeInTheDocument();
    expect(server.sent('POST', '/api/campaigns')[0]?.body).toEqual({ name: 'New World', description: 'Pirates and sea monsters.' });
    expect(screen.getByLabelText('Campaign name')).toHaveValue('');
    expect(screen.getByLabelText("What's it about? (optional)")).toHaveValue('');
  });

  it('keeps the start form filled in and shows why it failed', async () => {
    server.on('POST', '/api/campaigns', () => failWith(400, 'Name is required'));
    renderApp('/campaigns');
    await screen.findByText(/No campaigns yet/);
    await user.type(screen.getByLabelText('Campaign name'), 'New World');
    await user.click(screen.getByRole('button', { name: 'Start it' }));
    const form = screen.getByRole('form', { name: 'Start a campaign' });
    expect(await within(form).findByRole('alert')).toHaveTextContent('Name is required');
    expect(screen.getByLabelText('Campaign name')).toHaveValue('New World');
    expect(within(screen.getByRole('form', { name: 'Got an invite code?' })).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('joins a campaign with a trimmed invite code', async () => {
    server.on('POST', '/api/campaigns/join', () => sunkenKeep);
    renderApp('/campaigns');
    await screen.findByText(/No campaigns yet/);
    await user.type(screen.getByLabelText('Invite code'), ' KEEP42 ');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(await screen.findByRole('heading', { name: 'The Sunken Keep' })).toBeInTheDocument();
    expect(server.sent('POST', '/api/campaigns/join')[0]?.body).toEqual({ inviteCode: 'KEEP42' });
    expect(screen.getByLabelText('Invite code')).toHaveValue('');
  });

  it('shows the error for an unknown invite code on the ticket', async () => {
    server.on('POST', '/api/campaigns/join', () => failWith(404, 'No campaign has that invite code'));
    renderApp('/campaigns');
    await screen.findByText(/No campaigns yet/);
    await user.type(screen.getByLabelText('Invite code'), 'NOPE');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    const ticket = screen.getByRole('form', { name: 'Got an invite code?' });
    expect(await within(ticket).findByRole('alert')).toHaveTextContent('No campaign has that invite code');
  });

  it('does not list a campaign twice when you join one you are already in', async () => {
    memberships = [sunkenKeep];
    server.on('POST', '/api/campaigns/join', () => sunkenKeep);
    renderApp('/campaigns');
    await screen.findByRole('heading', { name: 'The Sunken Keep' });
    await user.type(screen.getByLabelText('Invite code'), 'KEEP42');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await vi.waitFor(() => expect(server.sent('POST', '/api/campaigns/join')).toHaveLength(1));
    expect(screen.getAllByRole('heading', { name: 'The Sunken Keep' })).toHaveLength(1);
  });

  it('stops the name, description and invite code at their limits', async () => {
    renderApp('/campaigns');
    await screen.findByText(/No campaigns yet/);
    await user.click(screen.getByLabelText('Campaign name'));
    await user.paste('c'.repeat(CAMPAIGN_LIMITS.name + 50));
    await user.click(screen.getByLabelText("What's it about? (optional)"));
    await user.paste('d'.repeat(CAMPAIGN_LIMITS.description + 50));
    await user.click(screen.getByLabelText('Invite code'));
    await user.paste('i'.repeat(CAMPAIGN_LIMITS.inviteCode + 50));
    expect(screen.getByLabelText('Campaign name')).toHaveValue('c'.repeat(CAMPAIGN_LIMITS.name));
    expect(screen.getByLabelText("What's it about? (optional)")).toHaveValue('d'.repeat(CAMPAIGN_LIMITS.description));
    expect(screen.getByLabelText('Invite code')).toHaveValue('i'.repeat(CAMPAIGN_LIMITS.inviteCode));
  });

  it('shows the whole of a name at the length limit', async () => {
    const longName = 'W'.repeat(CAMPAIGN_LIMITS.name);
    memberships = [makeMembership(makeCampaign(3, longName), 'GM')];
    renderApp('/campaigns');
    expect(await screen.findByRole('heading', { name: longName })).toHaveTextContent(longName);
  });

  it('cuts a long description short until you ask for the rest', async () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(400);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(78);
    memberships = [makeMembership(makeCampaign(1, 'Dragon Quest', { description: 'The tide comes in twice a night. '.repeat(60) }), 'GM')];
    renderApp('/campaigns');
    await screen.findByRole('heading', { name: 'Dragon Quest' });
    const pin = pinFor('Dragon Quest');
    const more = within(pin).getByRole('button', { name: 'Show more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(within(pin).getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(pin).getByRole('button', { name: 'Show less' }));
    expect(within(pin).getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('does not offer Show more for a short description', async () => {
    memberships = [sunkenKeep];
    renderApp('/campaigns');
    await screen.findByRole('heading', { name: 'The Sunken Keep' });
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('logs out from the name tag', async () => {
    renderApp('/campaigns');
    await screen.findByText(/No campaigns yet/);
    expect(screen.getByText('Mira')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.getByRole('tab', { name: 'Log in' })).toBeInTheDocument();
    expect(sessionStorage.getItem('ck_token')).toBeNull();
  });
});
