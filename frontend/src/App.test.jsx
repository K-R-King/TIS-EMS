import { render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App';
import api from './api';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  setUnauthorizedHandler: vi.fn(),
  errorMessage: (e, fallback) => fallback,
}));

afterEach(() => {
  vi.resetAllMocks();
  window.history.pushState({}, '', '/');
});

test('logged-out users opening a protected page see the login form', async () => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  window.history.pushState({}, '', '/expenses/new');

  render(<App />);

  expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.queryByText(/add expense/i)).not.toBeInTheDocument();
});

test('managers do not see admin links', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: { id: 3, name: 'Mia', username: 'mia', role: 'MANAGER' } });
    if (url === '/expenses') return Promise.resolve({ data: { items: [], total: 0, totalAmount: 0, page: 0, size: 25 } });
    return Promise.resolve({ data: [] });
  });
  window.history.pushState({}, '', '/expenses');

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
  expect(await screen.findByText('No expenses yet')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /add expense/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /import/i })).not.toBeInTheDocument();
});
