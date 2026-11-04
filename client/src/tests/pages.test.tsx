import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, LIMITS, type Campaign, type Membership, type Roll } from '../api/client';
import { AuthProvider } from '../auth';
import { Campaigns } from '../pages/Campaigns';
import { Dice, validNotation } from '../pages/Dice';
import { Login } from '../pages/Login';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: {
      register: vi.fn(),
      login: vi.fn(),
      campaigns: vi.fn(),
      campaign: vi.fn(),
      createCampaign: vi.fn(),
      joinCampaign: vi.fn(),
      newInviteCode: vi.fn(),
      rolls: vi.fn(),
      roll: vi.fn(),
    },
  };
});

const user = userEvent.setup({ delay: null });

function makeCampaign(id: number, name: string, inviteCode = `CODE${id}`, description = ''): Campaign {
  return { id, name, description, inviteCode, createdAt: '2026-11-01T18:00:00.000Z' };
}

function makeRoll(id: number, expression: string, results: number[], modifier: number, displayName = 'Ann'): Roll {
  const total = results.reduce((sum, die) => sum + die, modifier);
  return { id, campaignId: 7, userId: 2, displayName, expression, results, modifier, total, rolledAt: '2026-11-01T19:30:00.000Z' };
}

const sunkenKeep: Membership = { campaign: makeCampaign(7, 'The Sunken Keep', 'KEEP42'), role: 'PLAYER' };

function renderPage(page: ReactNode, path = '/', pattern = '*') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={page} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

async function findCard(name: string) {
  const heading = await screen.findByRole('heading', { name });
  const card = heading.closest('.card');
  if (!(card instanceof HTMLElement)) throw new Error(`No card around the ${name} heading`);
  return card;
}

function renderDice() {
  return renderPage(<Dice />, '/campaigns/7/dice', '/campaigns/:campaignId/dice');
}

describe('Login', () => {
  it('switches to sign up and asks for a display name', async () => {
    renderPage(<Login />);
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });

  it('shows the server error when login fails', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Wrong email or password'));
    renderPage(<Login />);
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), '123456');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password');
  });

  it('registers with the display name, email and password', async () => {
    vi.mocked(api.register).mockResolvedValue({
      token: 'token-1',
      user: { id: 1, email: 'ann@example.com', displayName: 'Ann', createdAt: '2026-11-01T18:00:00.000Z' },
    });
    renderPage(<Login />);
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    await user.type(screen.getByLabelText('Display name'), ' Ann ');
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(api.register).toHaveBeenCalledWith('Ann', 'ann@example.com', 'secret1');
  });

  it('stops each sign up field at the database limit', async () => {
    renderPage(<Login />);
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    await user.type(screen.getByLabelText('Display name'), 'n'.repeat(LIMITS.displayName + 20));
    await user.type(screen.getByLabelText('Email'), 'e'.repeat(LIMITS.email + 20));
    await user.type(screen.getByLabelText('Password'), 'p'.repeat(LIMITS.passwordMax + 20));
    expect(screen.getByLabelText('Display name')).toHaveValue('n'.repeat(LIMITS.displayName));
    expect(screen.getByLabelText('Email')).toHaveValue('e'.repeat(LIMITS.email));
    expect(screen.getByLabelText('Password')).toHaveValue('p'.repeat(LIMITS.passwordMax));
  });
});

describe('Campaigns', () => {
  beforeEach(() => {
    vi.mocked(api.campaigns).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists each campaign with your role', async () => {
    vi.mocked(api.campaigns).mockResolvedValue([{ campaign: makeCampaign(1, 'Dragon Quest'), role: 'GM' }, sunkenKeep]);
    renderPage(<Campaigns />);
    expect(await screen.findByText('Dragon Quest')).toBeInTheDocument();
    expect(screen.getByText('Game Master')).toBeInTheDocument();
    expect(screen.getByText('The Sunken Keep')).toBeInTheDocument();
    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('links each campaign to its own dice roller', async () => {
    vi.mocked(api.campaigns).mockResolvedValue([sunkenKeep]);
    renderPage(<Campaigns />);
    expect(await screen.findByRole('link', { name: 'Dice roller' })).toHaveAttribute('href', '/campaigns/7/dice');
  });

  it('creates a campaign with a description and shows its invite code', async () => {
    vi.mocked(api.createCampaign).mockResolvedValue({ campaign: makeCampaign(2, 'New World', 'ABC123', 'Pirates and sea monsters.'), role: 'GM' });
    renderPage(<Campaigns />);
    await screen.findByText('No campaigns yet. Create or join one below.');
    await user.type(screen.getByLabelText('Campaign name'), 'New World');
    await user.type(screen.getByLabelText('Description (optional)'), ' Pirates and sea monsters. ');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));
    const card = await findCard('New World');
    expect(api.createCampaign).toHaveBeenCalledWith('New World', 'Pirates and sea monsters.');
    expect(within(card).getByText('ABC123')).toBeInTheDocument();
    expect(within(card).getByText('Pirates and sea monsters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign name')).toHaveValue('');
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('');
  });

  it('creates a campaign without a description', async () => {
    vi.mocked(api.createCampaign).mockResolvedValue({ campaign: makeCampaign(2, 'New World'), role: 'GM' });
    renderPage(<Campaigns />);
    await screen.findByText('No campaigns yet. Create or join one below.');
    await user.type(screen.getByLabelText('Campaign name'), 'New World');
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));
    await findCard('New World');
    expect(api.createCampaign).toHaveBeenCalledWith('New World', '');
  });

  it('shows the invite code and New code button to the GM only', async () => {
    vi.mocked(api.campaigns).mockResolvedValue([{ campaign: makeCampaign(1, 'Dragon Quest', 'DRAGON'), role: 'GM' }, sunkenKeep]);
    renderPage(<Campaigns />);
    const gmCard = await findCard('Dragon Quest');
    const playerCard = await findCard('The Sunken Keep');
    expect(within(gmCard).getByText('DRAGON')).toBeInTheDocument();
    expect(within(gmCard).getByRole('button', { name: 'New code' })).toBeInTheDocument();
    expect(within(playerCard).queryByText(/Invite code/)).not.toBeInTheDocument();
    expect(within(playerCard).queryByText('KEEP42')).not.toBeInTheDocument();
    expect(within(playerCard).queryByRole('button', { name: 'New code' })).not.toBeInTheDocument();
  });

  it('swaps in the new invite code when the GM asks for one', async () => {
    vi.mocked(api.campaigns).mockResolvedValue([{ campaign: makeCampaign(1, 'Dragon Quest', 'DRAGON'), role: 'GM' }]);
    vi.mocked(api.newInviteCode).mockResolvedValue(makeCampaign(1, 'Dragon Quest', 'WYVERN'));
    renderPage(<Campaigns />);
    const card = await findCard('Dragon Quest');
    await user.click(within(card).getByRole('button', { name: 'New code' }));
    expect(await within(card).findByText('WYVERN')).toBeInTheDocument();
    expect(within(card).queryByText('DRAGON')).not.toBeInTheDocument();
    expect(api.newInviteCode).toHaveBeenCalledWith(1);
  });

  it('keeps the old invite code and shows the error when a new one fails', async () => {
    vi.mocked(api.campaigns).mockResolvedValue([{ campaign: makeCampaign(1, 'Dragon Quest', 'DRAGON'), role: 'GM' }]);
    vi.mocked(api.newInviteCode).mockRejectedValue(new Error('Only the GM can change the invite code'));
    renderPage(<Campaigns />);
    const card = await findCard('Dragon Quest');
    await user.click(within(card).getByRole('button', { name: 'New code' }));
    expect(await within(card).findByRole('alert')).toHaveTextContent('Only the GM can change the invite code');
    expect(within(card).getByText('DRAGON')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'New code' })).toBeEnabled();
  });

  it('shows the description on every member card', async () => {
    const keep = { ...sunkenKeep, campaign: { ...sunkenKeep.campaign, description: 'A flooded fortress on the coast.' } };
    vi.mocked(api.campaigns).mockResolvedValue([keep]);
    renderPage(<Campaigns />);
    const card = await findCard('The Sunken Keep');
    expect(within(card).getByText('A flooded fortress on the coast.')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('cuts off a long description until you ask for the rest', async () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(400);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(72);
    const long = 'The tide comes in twice a night. '.repeat(60);
    vi.mocked(api.campaigns).mockResolvedValue([{ campaign: makeCampaign(1, 'Dragon Quest', 'DRAGON', long), role: 'GM' }]);
    renderPage(<Campaigns />);
    const card = await findCard('Dragon Quest');
    const more = within(card).getByRole('button', { name: 'Show more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    const less = within(card).getByRole('button', { name: 'Show less' });
    expect(less).toHaveAttribute('aria-expanded', 'true');
    await user.click(less);
    expect(within(card).getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('joins a campaign with an invite code', async () => {
    vi.mocked(api.joinCampaign).mockResolvedValue(sunkenKeep);
    renderPage(<Campaigns />);
    await screen.findByText('No campaigns yet. Create or join one below.');
    await user.type(screen.getByLabelText('Invite code'), ' KEEP42 ');
    await user.click(screen.getByRole('button', { name: 'Join campaign' }));
    expect(await screen.findByText('The Sunken Keep')).toBeInTheDocument();
    expect(api.joinCampaign).toHaveBeenCalledWith('KEEP42');
  });

  it('shows the server error for an unknown invite code', async () => {
    vi.mocked(api.joinCampaign).mockRejectedValue(new Error('No campaign has that invite code'));
    renderPage(<Campaigns />);
    await user.type(screen.getByLabelText('Invite code'), 'BAD');
    await user.click(screen.getByRole('button', { name: 'Join campaign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No campaign has that invite code');
  });

  it('stops the campaign name, description and invite code at their limits', async () => {
    renderPage(<Campaigns />);
    await user.type(screen.getByLabelText('Campaign name'), 'c'.repeat(LIMITS.campaignName + 20));
    await user.click(screen.getByLabelText('Description (optional)'));
    await user.paste('d'.repeat(LIMITS.campaignDescription + 20));
    await user.type(screen.getByLabelText('Invite code'), 'i'.repeat(LIMITS.inviteCode + 20));
    expect(screen.getByLabelText('Campaign name')).toHaveValue('c'.repeat(LIMITS.campaignName));
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('d'.repeat(LIMITS.campaignDescription));
    expect(screen.getByLabelText('Invite code')).toHaveValue('i'.repeat(LIMITS.inviteCode));
  });
});

describe('Dice', () => {
  beforeEach(() => {
    vi.mocked(api.campaign).mockResolvedValue(sunkenKeep);
    vi.mocked(api.rolls).mockResolvedValue([]);
  });

  it('rolls in the campaign from the URL and shows each die and the total', async () => {
    vi.mocked(api.roll).mockResolvedValue(makeRoll(1, '2d6+3', [4, 5], 3));
    renderDice();
    await screen.findByText('No rolls yet.');
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }));
    expect(await screen.findByLabelText('Die 1: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Die 2: 5')).toBeInTheDocument();
    expect(screen.getByText(/^Total:/)).toHaveTextContent('Total: 12');
    expect(api.roll).toHaveBeenCalledWith(7, '2d6+3');
    expect(api.campaign).toHaveBeenCalledWith(7);
    expect(api.rolls).toHaveBeenCalledWith(7);
  });

  it('shows the campaign name and its recent rolls', async () => {
    vi.mocked(api.rolls).mockResolvedValue([makeRoll(5, '1d20-1', [17], -1, 'Bo'), makeRoll(4, '2d6', [1, 2], 0)]);
    renderDice();
    const feed = await screen.findByRole('list', { name: 'Recent rolls' });
    const items = within(feed).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Bo rolled 1d20-1: 17 (-1) = 16');
    expect(items[1]).toHaveTextContent('Ann rolled 2d6: 1, 2 = 3');
    expect(screen.getByText(/The Sunken Keep/)).toBeInTheDocument();
  });

  it('puts a new roll at the top of the feed', async () => {
    vi.mocked(api.rolls).mockResolvedValue([makeRoll(4, '2d6', [1, 2], 0, 'Bo')]);
    vi.mocked(api.roll).mockResolvedValue(makeRoll(9, '2d6+3', [6, 6], 3));
    renderDice();
    const feed = await screen.findByRole('list', { name: 'Recent rolls' });
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }));
    await screen.findByLabelText('Die 1: 6');
    const items = within(feed).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Ann rolled 2d6+3: 6, 6 (+3) = 15');
    expect(items[1]).toHaveTextContent('Bo rolled 2d6');
  });

  it.each(['abc', '2d7', '101d6', '0d20'])('rejects %s without calling the server', async (notation) => {
    renderDice();
    await screen.findByText('No rolls yet.');
    await user.clear(screen.getByLabelText('Dice notation'));
    await user.type(screen.getByLabelText('Dice notation'), notation);
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid dice notation');
    expect(api.roll).not.toHaveBeenCalled();
  });

  it('shows the server error when a roll fails', async () => {
    vi.mocked(api.roll).mockRejectedValue(new Error('You are not in this campaign'));
    renderDice();
    await screen.findByText('No rolls yet.');
    await user.click(screen.getByRole('button', { name: 'Roll Dice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You are not in this campaign');
  });

  it('stops the notation input at 40 characters', async () => {
    renderDice();
    await user.clear(screen.getByLabelText('Dice notation'));
    await user.type(screen.getByLabelText('Dice notation'), '1'.repeat(LIMITS.expression + 20));
    expect(screen.getByLabelText('Dice notation')).toHaveValue('1'.repeat(LIMITS.expression));
  });
});

describe('validNotation', () => {
  it.each(['d20', '2d6+3', '1d20-1', '100d100', '4D8', ' 3d10 '])('accepts %s', (notation) => {
    expect(validNotation(notation)).toBe(true);
  });

  it.each(['abc', 'd', '2d7', '2d1000', '0d6', '101d6', '2d6+', '2d6 + 3', `1d20+${'9'.repeat(40)}`])('rejects %s', (notation) => {
    expect(validNotation(notation)).toBe(false);
  });
});
