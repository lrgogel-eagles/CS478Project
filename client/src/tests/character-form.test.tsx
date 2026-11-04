import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CHARACTER_LIMITS } from '../features/characters/characters-api';
import { failWith, fakeServer, type FakeServer } from './fake-server';
import { alex, makeCharacter, mira, sam } from './fixtures';
import { currentLocation, renderApp, serveTable, signIn } from './render-app';

const user = userEvent.setup({ delay: null });

async function replace(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  if (value !== '') await user.type(input, value);
}

describe('Character form', () => {
  let server: FakeServer;

  beforeEach(() => {
    server = fakeServer();
    signIn(sam);
    serveTable(server, { role: 'PLAYER' });
  });

  it('adds a new character to the party', async () => {
    server.on('POST', '/api/campaigns/:id/characters', (request) => ({ ...makeCharacter(5, sam), ...(request.body as object) }));
    renderApp('/campaigns/7/characters/new');
    await screen.findByRole('heading', { name: 'New character' });
    await replace('Character name', '  Thorne ');
    await replace('Race', 'Dwarf');
    await replace('Class', 'fighter');
    await replace('Level', '3');
    await replace('Str', '16');
    await replace('Int', '8');
    await replace('Hit points', '31');
    await replace('Gold', '45');
    await user.click(screen.getByRole('button', { name: 'Add to the party' }));
    await screen.findByRole('region', { name: 'The party' });
    expect(currentLocation()).toBe('/campaigns/7#party');
    expect(server.sent('POST', '/api/campaigns/:id/characters')[0]?.body).toEqual({
      name: 'Thorne',
      race: 'Dwarf',
      charClass: 'fighter',
      level: 3,
      hitPoints: 31,
      gold: 45,
      abilityScores: { str: 16, dex: 10, con: 10, int: 8, wis: 10, cha: 10 },
    });
  });

  it('works out each modifier as you type the score', async () => {
    renderApp('/campaigns/7/characters/new');
    await screen.findByRole('heading', { name: 'New character' });
    const strength = screen.getByLabelText('Str').closest('.ability');
    expect(strength).toHaveTextContent('+0');
    await replace('Str', '18');
    expect(strength).toHaveTextContent('+4');
    await replace('Str', '7');
    expect(strength).toHaveTextContent('−2');
    await replace('Str', '');
    expect(strength).toHaveTextContent('?');
  });

  it.each([
    ['Character name', '', 'Give the character a name.'],
    ['Level', '25', 'Level needs a whole number from 1 to 20.'],
    ['Level', '2.5', 'Level needs a whole number from 1 to 20.'],
    ['Dex', '0', 'Dex needs a whole number from 1 to 30.'],
    ['Hit points', '-1000', 'Hit points needs a whole number from -999 to 9999.'],
    ['Gold', '-5', 'Gold needs a whole number from 0 to 2147483647.'],
  ])('catches a bad %s (%s) before it reaches the server', async (label, value, message) => {
    renderApp('/campaigns/7/characters/new');
    await screen.findByRole('heading', { name: 'New character' });
    await replace('Character name', 'Thorne');
    await replace(label, value);
    await user.click(screen.getByRole('button', { name: 'Add to the party' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(server.sent('POST', '/api/campaigns/:id/characters')).toHaveLength(0);
  });

  it('shows the server error and keeps what you typed', async () => {
    server.on('POST', '/api/campaigns/:id/characters', () => failWith(400, 'Name is too long'));
    renderApp('/campaigns/7/characters/new');
    await screen.findByRole('heading', { name: 'New character' });
    await replace('Character name', 'Thorne');
    await user.click(screen.getByRole('button', { name: 'Add to the party' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name is too long');
    expect(screen.getByLabelText('Character name')).toHaveValue('Thorne');
  });

  it('edits your own character', async () => {
    server.on('GET', '/api/campaigns/:id/characters/:characterId', () => makeCharacter(1, sam, { name: 'Thorne', hitPoints: 31 }));
    server.on('PATCH', '/api/campaigns/:id/characters/:characterId', (request) => ({ ...makeCharacter(1, sam), ...(request.body as object) }));
    renderApp('/campaigns/7/characters/1');
    expect(await screen.findByLabelText('Character name')).toHaveValue('Thorne');
    expect(screen.getByLabelText('Str')).toHaveValue(16);
    await replace('Hit points', '12');
    await user.click(screen.getByRole('button', { name: 'Save the sheet' }));
    await screen.findByRole('region', { name: 'The party' });
    const sent = server.sent('PATCH', '/api/campaigns/:id/characters/:characterId')[0];
    expect(sent?.path).toBe('/api/campaigns/7/characters/1');
    expect(sent?.body).toMatchObject({ name: 'Thorne', hitPoints: 12, abilityScores: { str: 16, int: 8 } });
  });

  it("won't let a player edit someone else's character", async () => {
    server.on('GET', '/api/campaigns/:id/characters/:characterId', () => makeCharacter(2, alex, { name: 'Pip' }));
    renderApp('/campaigns/7/characters/2');
    expect(await screen.findByRole('alert')).toHaveTextContent('Only the player who made this character, or the Game Master, can change it.');
    expect(screen.queryByRole('button', { name: 'Save the sheet' })).not.toBeInTheDocument();
  });

  it("lets the GM edit anyone's character", async () => {
    signIn(mira);
    serveTable(server, { role: 'GM' });
    server.on('GET', '/api/campaigns/:id/characters/:characterId', () => makeCharacter(2, alex, { name: 'Pip' }));
    renderApp('/campaigns/7/characters/2');
    expect(await screen.findByLabelText('Character name')).toHaveValue('Pip');
    expect(screen.getByRole('button', { name: 'Save the sheet' })).toBeInTheDocument();
  });

  it('shows the error when the character is missing', async () => {
    server.on('GET', '/api/campaigns/:id/characters/:characterId', () => failWith(404, 'Character not found'));
    renderApp('/campaigns/7/characters/99');
    expect(await screen.findByRole('alert')).toHaveTextContent('Character not found');
  });

  it('stops the name, race and class at their limits', async () => {
    renderApp('/campaigns/7/characters/new');
    await screen.findByRole('heading', { name: 'New character' });
    for (const [label, limit] of [
      ['Character name', CHARACTER_LIMITS.name],
      ['Race', CHARACTER_LIMITS.label],
      ['Class', CHARACTER_LIMITS.label],
    ] as const) {
      await user.click(screen.getByLabelText(label));
      await user.paste('x'.repeat(limit + 50));
      expect(screen.getByLabelText(label)).toHaveValue('x'.repeat(limit));
    }
  });

  it('goes back to the party when you cancel', async () => {
    renderApp('/campaigns/7/characters/new');
    await user.click(await screen.findByRole('link', { name: 'Cancel' }));
    expect(currentLocation()).toBe('/campaigns/7#party');
  });
});
