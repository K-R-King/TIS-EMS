import { render, screen } from '@testing-library/react';
import App from './App';
import api from './api';

jest.mock('./api', () => {
  const instance = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
  return {
    __esModule: true,
    default: instance,
    setUnauthorizedHandler: jest.fn(),
    errorMessage: (e, fallback) => fallback,
  };
});

afterEach(() => {
  jest.resetAllMocks();
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
    if (url === '/dropdowns/statuses') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  window.history.pushState({}, '', '/expenses');

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /add expense/i })).not.toBeInTheDocument();
});
