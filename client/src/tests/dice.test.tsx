import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Roll } from '../features/dice/dice-api';
import { DICE_LIMITS } from '../features/dice/dice-api';
import { lastRollKey } from '../features/dice/DiceTray';
import { ROLLS_SHOWN } from '../features/dice/RollLog';
import { POLL_MS } from '../features/dice/use-live-rolls';
import { failWith, fakeServer, type FakeServer } from './fake-server';
import { alex, makeRoll, mira, sam } from './fixtures';
import { renderApp, serveTable, signIn } from './render-app';

const user = userEvent.setup({ delay: null });
const NOTATION_HELP = 'That roll needs to look like 1d20, 2d6+3 or 4d8-1, with up to 100 of d4, d6, d8, d10, d12, d20 or d100.';

function tray() {
  return screen.getByRole('complementary', { name: 'Dice' });
}

function rollLines() {
  return within(screen.getByRole('list', { name: 'Recent rolls' })).getAllByRole('listitem');
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('Dice tray', () => {
  let server: FakeServer;
  let rolls: Roll[];

  beforeEach(() => {
    server = fakeServer();
    rolls = [];
    serveTable(server);
    server.on('GET', '/api/campaigns/:id/rolls', () => rolls);
    signIn(mira);
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
  });

  async function openTray() {
    renderApp('/campaigns/7');
    const aside = await screen.findByRole('complementary', { name: 'Dice' });
    await vi.waitFor(() => expect(within(aside).queryByText('Gathering the dice...')).not.toBeInTheDocument());
  }

  it('rolls one die as soon as you tap it', async () => {
    server.on('POST', '/api/campaigns/:id/rolls', () => makeRoll(1, '1d20', [17], 0, mira));
    await openTray();
    await user.click(within(tray()).getByRole('button', { name: 'Roll 1d20' }));
    expect(await within(tray()).findByText('17', { selector: 'strong' })).toBeInTheDocument();
    expect(server.sent('POST', '/api/campaigns/:id/rolls')[0]?.body).toEqual({ expression: '1d20' });
    expect(within(tray()).getByLabelText('What are you rolling?')).toHaveValue('1d20');
    expect(within(tray()).getByRole('button', { name: 'Roll 1d20' })).toHaveAttribute('data-picked', 'true');
  });

  it('rolls what you type and spells out the math', async () => {
    server.on('POST', '/api/campaigns/:id/rolls', () => makeRoll(2, '2d6+3', [4, 5], 3, mira));
    await openTray();
    const input = within(tray()).getByLabelText('What are you rolling?');
    await user.clear(input);
    await user.type(input, ' 2d6+3 ');
    await user.click(within(tray()).getByRole('button', { name: 'Roll' }));
    expect(await within(tray()).findByText('4 and 5, plus 3')).toBeInTheDocument();
    expect(within(tray()).getByText('12', { selector: 'strong' })).toBeInTheDocument();
    expect(server.sent('POST', '/api/campaigns/:id/rolls')[0]?.body).toEqual({ expression: '2d6+3' });
    expect(localStorage.getItem(lastRollKey(7))).toBe('2d6+3');
  });

  it('calls out a natural 20', async () => {
    server.on('POST', '/api/campaigns/:id/rolls', () => makeRoll(3, '1d20+5', [20], 5, mira));
    await openTray();
    await user.click(within(tray()).getByRole('button', { name: 'Roll 1d20' }));
    expect(await within(tray()).findByText('Natural 20')).toBeInTheDocument();
    expect(within(rollLines()[0] ?? tray()).getByText('natural 20')).toBeInTheDocument();
  });

  it('shows six dice and a count for the rest of a big roll', async () => {
    server.on('POST', '/api/campaigns/:id/rolls', () => makeRoll(4, '10d6', [1, 2, 3, 4, 5, 6, 1, 2, 3, 4], 0, mira));
    await openTray();
    const input = within(tray()).getByLabelText('What are you rolling?');
    await user.clear(input);
    await user.type(input, '10d6');
    await user.click(within(tray()).getByRole('button', { name: 'Roll' }));
    expect(await within(tray()).findByText('+4 more')).toBeInTheDocument();
    expect(within(tray()).getByText('10 dice')).toBeInTheDocument();
    expect(tray().querySelectorAll('.result-dice .die')).toHaveLength(6);
  });

  it.each(['abc', '2d7', '101d6', '0d20', '2d6 + 3'])('turns down %s without asking the server', async (notation) => {
    await openTray();
    const input = within(tray()).getByLabelText('What are you rolling?');
    await user.clear(input);
    await user.type(input, notation);
    await user.click(within(tray()).getByRole('button', { name: 'Roll' }));
    expect(within(tray()).getByRole('alert')).toHaveTextContent(NOTATION_HELP);
    expect(server.sent('POST', '/api/campaigns/:id/rolls')).toHaveLength(0);
  });

  it('shows the server error when a roll fails', async () => {
    server.on('POST', '/api/campaigns/:id/rolls', () => failWith(403, 'You are not in this campaign'));
    await openTray();
    await user.click(within(tray()).getByRole('button', { name: 'Roll' }));
    expect(await within(tray()).findByRole('alert')).toHaveTextContent('You are not in this campaign');
  });

  it('stops the roll box at 40 characters', async () => {
    await openTray();
    const input = within(tray()).getByLabelText('What are you rolling?');
    await user.clear(input);
    await user.click(input);
    await user.paste('1'.repeat(DICE_LIMITS.expression + 60));
    expect(input).toHaveValue('1'.repeat(DICE_LIMITS.expression));
  });

  it('remembers your last roll in this campaign', async () => {
    localStorage.setItem(lastRollKey(7), '4d8-1');
    await openTray();
    expect(within(tray()).getByLabelText('What are you rolling?')).toHaveValue('4d8-1');
    expect(within(tray()).getByRole('button', { name: 'Roll 1d8' })).toHaveAttribute('data-picked', 'true');
  });

  it('ignores a saved roll that no longer makes sense', async () => {
    localStorage.setItem(lastRollKey(7), 'banana');
    await openTray();
    expect(within(tray()).getByLabelText('What are you rolling?')).toHaveValue('1d20');
  });

  it('lists recent rolls with you, other players and the dice they got', async () => {
    rolls = [makeRoll(6, '1d20', [20], 0, alex), makeRoll(5, '2d6+3', [4, 6], 3, mira), makeRoll(4, '1d20-1', [12], -1, sam)];
    await openTray();
    const lines = rollLines();
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('Alex, 1d20natural 2020');
    expect(lines[1]).toHaveTextContent('You, 2d6+3 (4 and 6)13');
    expect(lines[2]).toHaveTextContent('Sam, 1d20-111');
  });

  it('shows the latest rolls and keeps older ones behind a button', async () => {
    rolls = Array.from({ length: ROLLS_SHOWN + 3 }, (_, index) => makeRoll(100 - index, '1d6', [(index % 6) + 1], 0, sam));
    await openTray();
    expect(rollLines()).toHaveLength(ROLLS_SHOWN);
    expect(rollLines()[0]).toHaveTextContent('Sam, 1d61');
    await user.click(screen.getByRole('button', { name: 'Show 3 older rolls' }));
    expect(rollLines()).toHaveLength(ROLLS_SHOWN + 3);
    expect(screen.queryByRole('button', { name: /older roll/ })).not.toBeInTheDocument();
  });

  it('puts your new roll at the top of the log', async () => {
    rolls = [makeRoll(4, '2d6', [1, 2], 0, sam)];
    server.on('POST', '/api/campaigns/:id/rolls', () => makeRoll(9, '1d12', [7], 0, mira));
    await openTray();
    await user.click(within(tray()).getByRole('button', { name: 'Roll 1d12' }));
    await within(tray()).findByText('7', { selector: 'strong' });
    expect(rollLines()[0]).toHaveTextContent('You, 1d127');
    expect(rollLines()[1]).toHaveTextContent('Sam, 2d6 (1 and 2)3');
  });

  it("checks for other players' rolls every few seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openTray();
    expect(within(tray()).getByText('No rolls yet.')).toBeInTheDocument();
    rolls = [makeRoll(11, '1d20', [8], 0, sam)];
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(await within(tray()).findByText(/^Sam, 1d20/)).toBeInTheDocument();
  });

  it('stops checking while the tab is hidden and catches up when you come back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openTray();
    const before = server.sent('GET', '/api/campaigns/:id/rolls').length;
    act(() => setVisibility('hidden'));
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 3));
    expect(server.sent('GET', '/api/campaigns/:id/rolls')).toHaveLength(before);
    rolls = [makeRoll(12, '1d6', [3], 0, alex)];
    act(() => setVisibility('visible'));
    expect(await within(tray()).findByText(/^Alex, 1d6/)).toBeInTheDocument();
    expect(server.sent('GET', '/api/campaigns/:id/rolls')).toHaveLength(before + 1);
  });

  it('says when it loses touch with the server and clears once it is back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openTray();
    server.on('GET', '/api/campaigns/:id/rolls', () => failWith(500, 'Database is down'));
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(await within(tray()).findByRole('status')).toHaveTextContent('Lost touch with the server, trying again.');
    server.on('GET', '/api/campaigns/:id/rolls', () => rolls);
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    await vi.waitFor(() => expect(within(tray()).queryByRole('status')).not.toBeInTheDocument());
  });
});
