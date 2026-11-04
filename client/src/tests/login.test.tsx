import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_LIMITS } from '../features/auth/auth-api';
import { failWith, fakeServer } from './fake-server';
import { mira } from './fixtures';
import { currentLocation, renderApp, signIn } from './render-app';

const user = userEvent.setup({ delay: null });

describe('Login page', () => {
  it('starts on Log in and switches to Sign up', async () => {
    fakeServer();
    renderApp('/login');
    expect(screen.getByRole('tab', { name: 'Log in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(screen.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 6 characters.');
  });

  it('moves between the tabs with the arrow keys', async () => {
    fakeServer();
    renderApp('/login');
    screen.getByRole('tab', { name: 'Log in' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Sign up' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Log in' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('tabindex', '-1');
  });

  it('shows the server error when the password is wrong', async () => {
    const server = fakeServer();
    server.on('POST', '/api/auth/login', () => failWith(401, 'Wrong email or password'));
    renderApp('/login');
    await user.type(screen.getByLabelText('Email'), 'mira@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-one');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password');
    expect(currentLocation()).toBe('/login');
  });

  it("says so when the server can't be reached", async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderApp('/login');
    await user.type(screen.getByLabelText('Email'), 'mira@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Check that it's running.");
  });

  it('signs up with a trimmed name and email and opens the campaign list', async () => {
    const server = fakeServer();
    server.on('POST', '/api/auth/register', () => ({ token: 'token-1', user: mira }));
    server.on('GET', '/api/campaigns', () => []);
    renderApp('/login');
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    await user.type(screen.getByLabelText('Display name'), '  Mira  ');
    await user.type(screen.getByLabelText('Email'), ' mira@example.com ');
    await user.type(screen.getByLabelText('Password'), ' secret1 ');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Your campaigns' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/campaigns');
    expect(server.sent('POST', '/api/auth/register')[0]?.body).toEqual({ displayName: 'Mira', email: 'mira@example.com', password: ' secret1 ' });
    expect(server.sent('GET', '/api/campaigns')[0]?.authorization).toBe('Bearer token-1');
  });

  it('stops each sign up field at the database limit', async () => {
    fakeServer();
    renderApp('/login');
    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    await user.click(screen.getByLabelText('Display name'));
    await user.paste('n'.repeat(AUTH_LIMITS.displayName + 50));
    await user.click(screen.getByLabelText('Email'));
    await user.paste('e'.repeat(AUTH_LIMITS.email + 50));
    await user.click(screen.getByLabelText('Password'));
    await user.paste('p'.repeat(AUTH_LIMITS.passwordMax + 50));
    expect(screen.getByLabelText('Display name')).toHaveValue('n'.repeat(AUTH_LIMITS.displayName));
    expect(screen.getByLabelText('Email')).toHaveValue('e'.repeat(AUTH_LIMITS.email));
    expect(screen.getByLabelText('Password')).toHaveValue('p'.repeat(AUTH_LIMITS.passwordMax));
  });

  it('sends a signed-in visitor straight to their campaigns', async () => {
    const server = fakeServer();
    server.on('GET', '/api/campaigns', () => []);
    signIn(mira);
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Your campaigns' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/campaigns');
  });

  it('sends a signed-out visitor to the login page', () => {
    fakeServer();
    renderApp('/campaigns/7');
    expect(currentLocation()).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Campaign Keeper' })).toBeInTheDocument();
  });
});
