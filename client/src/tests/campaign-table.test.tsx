import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { failWith, fakeServer, type FakeServer } from './fake-server';
import { alex, makeCampaign, makeCharacter, makeMember, makeNote, mira, sam } from './fixtures';
import { currentLocation, renderApp, serveTable, signIn } from './render-app';

const user = userEvent.setup({ delay: null });

function section(name: string) {
  return screen.getByRole('region', { name });
}

describe('Campaign table', () => {
  let server: FakeServer;

  beforeEach(() => {
    server = fakeServer();
    signIn(mira);
  });

  it('shows the campaign, who is playing and the invite code for the GM', async () => {
    serveTable(server, { members: [makeMember(mira, 'GM'), makeMember(sam, 'PLAYER'), makeMember(alex, 'PLAYER')] });
    renderApp('/campaigns/7');
    expect(await screen.findByRole('heading', { level: 1, name: 'The Sunken Keep' })).toBeInTheDocument();
    expect(screen.getByText('A flooded fortress on the coast.')).toBeInTheDocument();
    expect(screen.getByText('At the table: Mira (you), running it; Sam; Alex')).toBeInTheDocument();
    const ticket = screen.getByRole('complementary', { name: 'Invite code' });
    expect(within(ticket).getByText('KEEP42')).toBeInTheDocument();
    expect(screen.getByText('Game Master')).toBeInTheDocument();
  });

  it('hides the invite code and note writing from players', async () => {
    signIn(sam);
    serveTable(server, { role: 'PLAYER' });
    renderApp('/campaigns/7');
    await screen.findByRole('region', { name: 'Session notes' });
    expect(screen.queryByRole('complementary', { name: 'Invite code' })).not.toBeInTheDocument();
    expect(screen.queryByText('KEEP42')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '+ Write a note' })).not.toBeInTheDocument();
    expect(screen.getByText("Your Game Master hasn't written any notes yet.")).toBeInTheDocument();
    expect(screen.getByText('At the table: Mira, running it; Sam (you)')).toBeInTheDocument();
  });

  it('lists only the first 8 people until you ask for the rest', async () => {
    const crowd = Array.from({ length: 12 }, (_, index) => makeMember({ ...sam, id: 10 + index, displayName: `Player ${index + 1}` }, 'PLAYER'));
    serveTable(server, { members: [makeMember(mira, 'GM'), ...crowd] });
    renderApp('/campaigns/7');
    const more = await screen.findByRole('button', { name: 'and 5 more' });
    expect(screen.queryByText(/Player 8;/)).not.toBeInTheDocument();
    await user.click(more);
    expect(screen.getByText(/Player 12$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more$/ })).not.toBeInTheDocument();
  });

  it('copies the invite code', async () => {
    serveTable(server);
    renderApp('/campaigns/7');
    await user.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe('KEEP42');
    expect(within(screen.getByRole('complementary', { name: 'Invite code' })).getByRole('status')).toHaveTextContent('Copied');
  });

  it('swaps in a new invite code when the GM asks for one', async () => {
    serveTable(server);
    server.on('POST', '/api/campaigns/:id/invite-code', () => ({ campaign: makeCampaign(7, 'The Sunken Keep', { inviteCode: 'WYVERN' }) }));
    renderApp('/campaigns/7');
    await user.click(await screen.findByRole('button', { name: 'New code' }));
    expect(await screen.findByText('WYVERN')).toBeInTheDocument();
    expect(screen.queryByText('KEEP42')).not.toBeInTheDocument();
    expect(screen.getByText('New code made')).toBeInTheDocument();
  });

  it('keeps the old invite code and shows the error when a new one fails', async () => {
    serveTable(server);
    server.on('POST', '/api/campaigns/:id/invite-code', () => failWith(403, 'Only the GM can change the invite code'));
    renderApp('/campaigns/7');
    await user.click(await screen.findByRole('button', { name: 'New code' }));
    const ticket = screen.getByRole('complementary', { name: 'Invite code' });
    expect(await within(ticket).findByRole('alert')).toHaveTextContent('Only the GM can change the invite code');
    expect(within(ticket).getByText('KEEP42')).toBeInTheDocument();
    expect(within(ticket).getByRole('button', { name: 'New code' })).toBeEnabled();
  });

  it('puts each character on a sheet with scores, modifiers, hit points and gold', async () => {
    serveTable(server, {
      characters: [makeCharacter(1, sam, { name: 'Thorne', gold: 1234567 }), makeCharacter(2, mira, { name: 'Pip', race: '', charClass: '', level: 5 })],
    });
    renderApp('/campaigns/7');
    const thorne = await screen.findByRole('article', { name: 'Thorne' });
    expect(within(thorne).getByText('Dwarf fighter, level 3')).toBeInTheDocument();
    expect(within(thorne).getByText('Sam')).toBeInTheDocument();
    expect(within(thorne).getByText('16')).toBeInTheDocument();
    expect(within(thorne).getByText('+3')).toBeInTheDocument();
    expect(within(thorne).getByText('−1')).toBeInTheDocument();
    expect(within(thorne).getByText('31')).toBeInTheDocument();
    expect(within(thorne).getByText('1,234,567')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Pip' })).getByText('Level 5')).toBeInTheDocument();
  });

  it('lets a player edit only their own character', async () => {
    signIn(sam);
    serveTable(server, { role: 'PLAYER', characters: [makeCharacter(1, sam, { name: 'Thorne' }), makeCharacter(2, alex, { name: 'Pip' })] });
    renderApp('/campaigns/7');
    await screen.findByRole('article', { name: 'Thorne' });
    expect(screen.getByRole('link', { name: 'Edit Thorne' })).toHaveAttribute('href', '/campaigns/7/characters/1');
    expect(screen.queryByRole('link', { name: 'Edit Pip' })).not.toBeInTheDocument();
  });

  it('lets the GM edit every character', async () => {
    serveTable(server, { characters: [makeCharacter(1, sam, { name: 'Thorne' }), makeCharacter(2, alex, { name: 'Pip' })] });
    renderApp('/campaigns/7');
    await screen.findByRole('article', { name: 'Thorne' });
    expect(screen.getByRole('link', { name: 'Edit Thorne' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Pip' })).toBeInTheDocument();
  });

  it('shows 6 sheets until you ask for the rest of the party', async () => {
    serveTable(server, { characters: Array.from({ length: 9 }, (_, index) => makeCharacter(index + 1, sam)) });
    renderApp('/campaigns/7');
    await screen.findByRole('article', { name: 'Hero 1' });
    expect(within(section('The party')).getAllByRole('article')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Show 3 more characters' }));
    expect(within(section('The party')).getAllByRole('article')).toHaveLength(9);
  });

  it('says so when the party is empty', async () => {
    serveTable(server);
    renderApp('/campaigns/7');
    expect(await screen.findByText('No characters yet. Make the first one.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ New character' })).toHaveAttribute('href', '/campaigns/7/characters/new');
  });

  it('pins up session notes with the date and marks the GM-only ones', async () => {
    serveTable(server, {
      notes: [makeNote(2, { title: 'Session 2', sessionDate: '2026-11-04' }), makeNote(1, { title: 'Trap ideas', isGmOnly: true, sessionDate: '2026-10-28' })],
    });
    renderApp('/campaigns/7');
    const second = await screen.findByRole('article', { name: 'Session 2' });
    expect(within(second).getByText('Nov 4, 2026')).toHaveAttribute('datetime', '2026-11-04');
    expect(within(second).queryByText('Only you can see this note.')).not.toBeInTheDocument();
    const secret = screen.getByRole('article', { name: 'Trap ideas' });
    expect(secret).toHaveAttribute('data-gm-only', 'true');
    expect(within(secret).getByText('Only you can see this note.')).toBeInTheDocument();
    expect(within(secret).getByRole('link', { name: 'Edit Trap ideas' })).toHaveAttribute('href', '/campaigns/7/notes/1');
  });

  it('shows the newest 6 notes until you ask for older ones', async () => {
    serveTable(server, { notes: Array.from({ length: 8 }, (_, index) => makeNote(8 - index)) });
    renderApp('/campaigns/7');
    await screen.findByRole('article', { name: 'Session 8' });
    expect(within(section('Session notes')).getAllByRole('article')).toHaveLength(6);
    expect(screen.queryByRole('article', { name: 'Session 2' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show 2 older notes' }));
    expect(screen.getByRole('article', { name: 'Session 1' })).toBeInTheDocument();
  });

  it('shows the whole of oversized names and titles', async () => {
    const longName = 'Thorne'.repeat(10);
    const longTitle = 'T'.repeat(120);
    serveTable(server, {
      name: 'K'.repeat(80),
      characters: [makeCharacter(1, sam, { name: longName, race: 'R'.repeat(40), charClass: 'C'.repeat(40), hitPoints: -999, gold: 2147483647 })],
      notes: [makeNote(1, { title: longTitle, body: 'word '.repeat(4000) })],
    });
    renderApp('/campaigns/7');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('K'.repeat(80));
    const sheet = await screen.findByRole('article', { name: longName });
    expect(within(sheet).getByText(`${'R'.repeat(40)} ${'C'.repeat(40)}, level 3`)).toBeInTheDocument();
    expect(within(sheet).getByText('-999')).toBeInTheDocument();
    expect(within(sheet).getByText('2,147,483,647')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: longTitle })).toHaveTextContent(longTitle);
  });

  it('shows a way back when you are not in the campaign', async () => {
    serveTable(server);
    server.on('GET', '/api/campaigns/:id', () => failWith(403, 'You are not in this campaign'));
    renderApp('/campaigns/7');
    expect(await screen.findByRole('alert')).toHaveTextContent('You are not in this campaign');
    await user.click(screen.getByRole('link', { name: 'Back to your campaigns' }));
    expect(currentLocation()).toBe('/campaigns');
  });

  it('sends a bad campaign id back to the list', async () => {
    server.on('GET', '/api/campaigns', () => []);
    renderApp('/campaigns/abc');
    expect(await screen.findByRole('heading', { name: 'Your campaigns' })).toBeInTheDocument();
  });

  it('shows the error when the sheets and notes fail to load', async () => {
    serveTable(server);
    server.on('GET', '/api/campaigns/:id/notes', () => failWith(500, 'Database is down'));
    renderApp('/campaigns/7');
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down');
  });

  it('marks the page you are on in the nav and scrolls to the part you pick', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    serveTable(server);
    renderApp('/campaigns/7');
    await screen.findByRole('region', { name: 'Session notes' });
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(nav).getByRole('link', { name: 'Notes' }));
    expect(currentLocation()).toBe('/campaigns/7#notes');
    expect(scroll.mock.contexts.at(-1)).toBe(section('Session notes'));
    await user.click(within(nav).getByRole('link', { name: 'Dice' }));
    expect(scroll.mock.contexts.at(-1)).toBe(screen.getByRole('complementary', { name: 'Dice' }));
  });

  it('sends the old dice page to the dice tray', async () => {
    serveTable(server);
    renderApp('/campaigns/7/dice');
    expect(await screen.findByRole('complementary', { name: 'Dice' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/campaigns/7#dice');
  });
});
