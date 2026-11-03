import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import api from '../api';
import ExpenseList from './ExpenseList';
import { expense, mockGet, renderPage, USERS } from '../test/utils';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (e, fallback) => fallback,
}));

const page = (items, total = items.length, number = 0) => ({ items, total, totalAmount: 99999.5, page: number, size: 25 });
const listCalls = () => api.get.mock.calls.filter(([url]) => url === '/expenses').map(([, c]) => c.params);

beforeEach(() => {
  mockGet(api, { '/expenses': ({ params }) => page([expense(), expense({ id: 8, description: 'Taxi' })], 60, params.page) });
});

test('shows expenses with totals across all pages', async () => {
  renderPage(<ExpenseList />, { path: '/expenses' });
  // Rendered twice: table for wide screens, cards for phones (CSS picks one)
  expect(await screen.findAllByText('Team lunch')).toHaveLength(2);
  expect(screen.getByText(/60 expenses · ₹99,999.50/)).toBeVisible();
  expect(screen.getByText('Showing 1–25 of 60')).toBeVisible();
  expect(listCalls()[0]).toMatchObject({ page: 0, size: 25 });
});

test('filters are sent to the API and kept in the URL', async () => {
  const user = userEvent.setup();
  renderPage(<ExpenseList />, { path: '/expenses', route: '/expenses?page=2' });
  await screen.findAllByText('Team lunch');
  expect(listCalls().at(-1)).toMatchObject({ page: 1 });

  await user.selectOptions(screen.getByLabelText('Status'), 'Approved');

  await waitFor(() => expect(listCalls().at(-1)).toMatchObject({ status: 'Approved', page: 0 }));
  expect(screen.getByTestId('location')).toHaveTextContent('/expenses?status=Approved'); // back to page 1
  expect(screen.getByText('filter applied')).toBeVisible();
});

test('search waits for typing to pause', async () => {
  const user = userEvent.setup();
  renderPage(<ExpenseList />, { path: '/expenses' });
  await screen.findAllByText('Team lunch');
  await user.type(screen.getByLabelText('Search'), 'taxi');
  await waitFor(() => expect(listCalls().at(-1)).toMatchObject({ q: 'taxi' }));
  expect(listCalls().filter((p) => p.q && p.q !== 'taxi')).toHaveLength(0);
});

test('changing a filter while the search is still pending keeps both', async () => {
  const user = userEvent.setup();
  renderPage(<ExpenseList />, { path: '/expenses' });
  await screen.findAllByText('Team lunch');
  await user.type(screen.getByLabelText('Search'), 'taxi');
  await user.selectOptions(screen.getByLabelText('Status'), 'Approved'); // before the search delay has passed
  await waitFor(() => expect(listCalls().at(-1)).toMatchObject({ q: 'taxi', status: 'Approved' }));
  await new Promise((r) => setTimeout(r, 400));
  expect(listCalls().at(-1)).toMatchObject({ q: 'taxi', status: 'Approved' });
  expect(screen.getByLabelText('Status')).toHaveValue('Approved');
});

test('pagination requests the chosen page', async () => {
  const user = userEvent.setup();
  window.scrollTo = vi.fn();
  renderPage(<ExpenseList />, { path: '/expenses' });
  await screen.findAllByText('Team lunch');
  const pager = screen.getByRole('navigation', { name: 'Expense pages' });
  await user.click(within(pager).getByRole('button', { name: '3' }));
  await waitFor(() => expect(listCalls().at(-1)).toMatchObject({ page: 2 }));
  expect(await screen.findByText('Showing 51–60 of 60')).toBeVisible();
});

test('managers get no add or import buttons', async () => {
  renderPage(<ExpenseList />, { path: '/expenses', user: USERS.manager });
  await screen.findAllByText('Team lunch');
  expect(screen.queryByRole('link', { name: /add expense/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /import/i })).not.toBeInTheDocument();
});

test('explains an empty filtered result', async () => {
  mockGet(api, { '/expenses': page([]) });
  renderPage(<ExpenseList />, { path: '/expenses', route: '/expenses?status=Rejected' });
  expect(await screen.findByText('No expenses match these filters')).toBeVisible();
});
