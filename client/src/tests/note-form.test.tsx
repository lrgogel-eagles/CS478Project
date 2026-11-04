import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { NOTE_LIMITS } from '../features/notes/notes-api';
import { todayText } from '../features/notes/note-dates';
import { failWith, fakeServer, type FakeServer } from './fake-server';
import { makeNote, mira, sam } from './fixtures';
import { currentLocation, renderApp, serveTable, signIn } from './render-app';

const user = userEvent.setup({ delay: null });

describe('Session note form', () => {
  let server: FakeServer;

  beforeEach(() => {
    server = fakeServer();
    signIn(mira);
    serveTable(server, { role: 'GM' });
  });

  it("writes a new note dated today unless you change it", async () => {
    server.on('POST', '/api/campaigns/:id/notes', (request) => ({ ...makeNote(3), ...(request.body as object) }));
    renderApp('/campaigns/7/notes/new');
    await screen.findByRole('heading', { name: 'New session note' });
    expect(screen.getByLabelText('Played on')).toHaveValue(todayText());
    await user.type(screen.getByLabelText('Title'), '  Into the keep ');
    await user.type(screen.getByLabelText('What happened'), 'We found the gate.{enter}Pip set off a trap. ');
    await user.click(screen.getByRole('button', { name: 'Pin it up' }));
    await screen.findByRole('region', { name: 'Session notes' });
    expect(currentLocation()).toBe('/campaigns/7#notes');
    expect(server.sent('POST', '/api/campaigns/:id/notes')[0]?.body).toEqual({
      title: 'Into the keep',
      body: 'We found the gate.\nPip set off a trap.',
      sessionDate: todayText(),
      isGmOnly: false,
    });
  });

  it('keeps a note from the players when you tick the box', async () => {
    server.on('POST', '/api/campaigns/:id/notes', (request) => ({ ...makeNote(3), ...(request.body as object) }));
    renderApp('/campaigns/7/notes/new');
    await user.type(await screen.findByLabelText('Title'), 'Trap ideas');
    await user.click(screen.getByLabelText('Keep this note from the players'));
    await user.click(screen.getByRole('button', { name: 'Pin it up' }));
    await screen.findByRole('region', { name: 'Session notes' });
    expect(server.sent('POST', '/api/campaigns/:id/notes')[0]?.body).toMatchObject({ isGmOnly: true });
  });

  it('asks for a title and a date before saving', async () => {
    renderApp('/campaigns/7/notes/new');
    await screen.findByRole('heading', { name: 'New session note' });
    await user.click(screen.getByRole('button', { name: 'Pin it up' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give the note a title.');
    await user.type(screen.getByLabelText('Title'), 'Session 3');
    await user.clear(screen.getByLabelText('Played on'));
    await user.click(screen.getByRole('button', { name: 'Pin it up' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick the date you played.');
    expect(server.sent('POST', '/api/campaigns/:id/notes')).toHaveLength(0);
  });

  it('edits a note', async () => {
    server.on('GET', '/api/campaigns/:id/notes/:noteId', () => makeNote(4, { title: 'Session 4', sessionDate: '2026-10-21', isGmOnly: true }));
    server.on('PATCH', '/api/campaigns/:id/notes/:noteId', (request) => ({ ...makeNote(4), ...(request.body as object) }));
    renderApp('/campaigns/7/notes/4');
    expect(await screen.findByLabelText('Title')).toHaveValue('Session 4');
    expect(screen.getByLabelText('Played on')).toHaveValue('2026-10-21');
    expect(screen.getByLabelText('Keep this note from the players')).toBeChecked();
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Session 4, the flood');
    await user.click(screen.getByRole('button', { name: 'Save the note' }));
    await screen.findByRole('region', { name: 'Session notes' });
    const sent = server.sent('PATCH', '/api/campaigns/:id/notes/:noteId')[0];
    expect(sent?.path).toBe('/api/campaigns/7/notes/4');
    expect(sent?.body).toEqual({ title: 'Session 4, the flood', body: 'The party reached the flooded gate.', sessionDate: '2026-10-21', isGmOnly: true });
  });

  it('shows the server error and keeps the note', async () => {
    server.on('POST', '/api/campaigns/:id/notes', () => failWith(400, 'Title is too long'));
    renderApp('/campaigns/7/notes/new');
    await user.type(await screen.findByLabelText('Title'), 'Session 3');
    await user.click(screen.getByRole('button', { name: 'Pin it up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Title is too long');
    expect(screen.getByLabelText('Title')).toHaveValue('Session 3');
  });

  it('only lets the Game Master write notes', async () => {
    signIn(sam);
    serveTable(server, { role: 'PLAYER' });
    renderApp('/campaigns/7/notes/new');
    expect(await screen.findByRole('alert')).toHaveTextContent('Only the Game Master can write session notes.');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('stops the title and body at their limits', async () => {
    renderApp('/campaigns/7/notes/new');
    await user.click(await screen.findByLabelText('Title'));
    await user.paste('t'.repeat(NOTE_LIMITS.title + 50));
    await user.click(screen.getByLabelText('What happened'));
    await user.paste('b'.repeat(NOTE_LIMITS.body + 50));
    expect(screen.getByLabelText('Title')).toHaveValue('t'.repeat(NOTE_LIMITS.title));
    expect(screen.getByLabelText('What happened')).toHaveValue('b'.repeat(NOTE_LIMITS.body));
  });
});
