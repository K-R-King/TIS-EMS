import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import api from '../api';
import Users from './Users';
import { mockGet, renderPage, USERS } from '../test/utils';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (e, fallback) => e.response?.data?.error || fallback,
}));

const people = [
  { ...USERS.superadmin, locked: false, active: true },
  { ...USERS.manager, locked: true, active: true },
  { ...USERS.admin, locked: false, active: false },
];

test('locked accounts are marked and can be unlocked', async () => {
  const user = userEvent.setup();
  mockGet(api, { '/users': people });
  api.post.mockResolvedValue({ data: { ...USERS.manager, locked: false, active: true } });
  renderPage(<Users />, { path: '/users', user: USERS.superadmin });

  const row = (await screen.findByText('Mo Manager')).closest('tr');
  expect(within(row).getByText('Locked')).toBeVisible();
  await user.click(within(row).getByRole('button', { name: /unlock/i }));

  expect(api.post).toHaveBeenCalledWith('/users/3/unlock');
  expect(await screen.findByText('mo can log in again.')).toBeVisible();
  expect(within(row).queryByText('Locked')).not.toBeInTheDocument();
});

test('you cannot delete your own account', async () => {
  mockGet(api, { '/users': people });
  renderPage(<Users />, { path: '/users', user: USERS.superadmin });
  const me = (await screen.findByText('Erin Super')).closest('tr');
  expect(within(me).getByRole('button', { name: 'Delete erin' })).toBeDisabled();
});

test('new users need a password of at least 8 characters', async () => {
  const user = userEvent.setup();
  mockGet(api, { '/users': people });
  renderPage(<Users />, { path: '/users', user: USERS.superadmin });
  await user.click(await screen.findByRole('button', { name: /add user/i }));
  await user.type(screen.getByLabelText(/^username/i), 'newbie');
  await user.type(screen.getByLabelText(/^password/i), 'short');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Password must be at least 8 characters.')).toBeVisible();
  expect(api.post).not.toHaveBeenCalled();
});

test('deactivating asks first, then marks the account', async () => {
  const user = userEvent.setup();
  mockGet(api, { '/users': people });
  api.post.mockResolvedValue({ data: { ...USERS.manager, locked: false, active: false } });
  renderPage(<Users />, { path: '/users', user: USERS.superadmin });

  await user.click(await screen.findByRole('button', { name: 'Deactivate mo' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('logged out now');
  expect(api.post).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }));

  expect(api.post).toHaveBeenCalledWith('/users/3/deactivate');
  const row = (await screen.findByText('mo is deactivated and has been logged out.')) && screen.getByText('Mo Manager').closest('tr');
  expect(within(row).getByText('Deactivated')).toBeVisible();
  expect(within(row).getByRole('button', { name: 'Reactivate mo' })).toBeVisible();
});

test('deactivated accounts can be reactivated; you cannot deactivate yourself', async () => {
  const user = userEvent.setup();
  mockGet(api, { '/users': people });
  api.post.mockResolvedValue({ data: { ...USERS.admin, locked: false, active: true } });
  renderPage(<Users />, { path: '/users', user: USERS.superadmin });

  const row = (await screen.findByText('Arjun Admin')).closest('tr');
  expect(within(row).getByText('Deactivated')).toBeVisible();
  await user.click(within(row).getByRole('button', { name: 'Reactivate arjun' }));
  expect(api.post).toHaveBeenCalledWith('/users/2/activate');
  expect(await screen.findByText('arjun is active again and can log in.')).toBeVisible();

  expect(screen.getByRole('button', { name: 'Deactivate erin' })).toBeDisabled();
});
