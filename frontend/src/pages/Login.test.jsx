import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import Login from './Login';
import { AuthContext } from '../useAuth';
import { USERS } from '../test/utils';

function renderLogin(login, state) {
  render(
    <AuthContext.Provider value={{ user: null, checking: false, login }}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<div>Landed on {window.location.pathname}</div>} />
          <Route path="/expenses" element={<div>Expense list page</div>} />
          <Route path="/settings" element={<div>Settings page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

async function signIn(user) {
  await user.type(screen.getByLabelText('Username'), 'mo');
  await user.type(screen.getByLabelText('Password'), 'secret-pass');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

test('managers land on the expense list', async () => {
  const user = userEvent.setup();
  const login = vi.fn().mockResolvedValue(USERS.manager);
  renderLogin(login);
  await signIn(user);
  expect(login).toHaveBeenCalledWith('mo', 'secret-pass');
  expect(await screen.findByText('Expense list page')).toBeVisible();
});

test('returns to the page the user originally asked for', async () => {
  const user = userEvent.setup();
  renderLogin(vi.fn().mockResolvedValue(USERS.superadmin), { from: { pathname: '/settings' } });
  await signIn(user);
  expect(await screen.findByText('Settings page')).toBeVisible();
});

test('shows the server message, e.g. for a locked account', async () => {
  const user = userEvent.setup();
  const locked = 'This account is locked after too many failed logins.';
  renderLogin(vi.fn().mockRejectedValue({ response: { status: 401, data: { error: locked } } }));
  await signIn(user);
  expect(await screen.findByRole('alert')).toHaveTextContent(locked);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
});

test('password can be shown while typing', async () => {
  const user = userEvent.setup();
  renderLogin(vi.fn());
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  await user.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
});
