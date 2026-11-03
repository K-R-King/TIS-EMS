import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import api from '../api';
import ExpenseForm from './ExpenseForm';
import { expense, mockGet, renderPage, USERS } from '../test/utils';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (e, fallback) => e.response?.data?.error || fallback,
}));

const NEW = { path: '/expenses/new' };

async function fillValid(user, { amount = '450.75', category = 'Travel' } = {}) {
  await user.clear(screen.getByLabelText(/amount/i));
  await user.type(screen.getByLabelText(/amount/i), amount);
  await user.selectOptions(screen.getByLabelText(/expense category/i), category);
}

describe('Add expense form', () => {
  beforeEach(() => mockGet(api, { '/expenses/duplicates': [] }));

  test('requires amount and category and does not submit', async () => {
    const user = userEvent.setup();
    renderPage(<ExpenseForm />, NEW);
    await screen.findByRole('option', { name: 'Travel' });

    await user.click(screen.getByRole('button', { name: /submit expense/i }));

    expect(screen.getByText('Amount is required.')).toBeVisible();
    expect(screen.getByText('Category is required.')).toBeVisible();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('rejects a future date', async () => {
    const user = userEvent.setup();
    renderPage(<ExpenseForm />, NEW);
    await screen.findByRole('option', { name: 'Travel' });
    await fillValid(user);
    const date = screen.getByLabelText(/^date/i);
    await user.clear(date);
    await user.type(date, '2999-01-01');

    await user.click(screen.getByRole('button', { name: /submit expense/i }));

    expect(screen.getByText('Date cannot be in the future.')).toBeVisible();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('keeps only digits and one decimal point in the amount', async () => {
    const user = userEvent.setup();
    renderPage(<ExpenseForm />, NEW);
    const amount = screen.getByLabelText(/amount/i);
    await user.type(amount, '-1a2.3.4x');
    expect(amount).toHaveValue('12.34');
  });

  test('rejects receipts that are not PDF, JPG or PNG', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPage(<ExpenseForm />, NEW);
    await user.upload(screen.getByLabelText(/upload a receipt/i), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByText('Attachment must be a PDF, JPG or PNG file.')).toBeVisible();
  });

  test('submits the expense as form data and opens it', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: expense({ id: 42 }) });
    renderPage(<ExpenseForm />, NEW);
    await screen.findByRole('option', { name: 'Travel' });
    await fillValid(user);
    await user.click(screen.getByLabelText(/tax applicable/i));
    await user.upload(screen.getByLabelText(/upload a receipt/i), new File(['%PDF'], 'bill.pdf', { type: 'application/pdf' }));

    await user.click(screen.getByRole('button', { name: /submit expense/i }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/expenses/42'));
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/expenses');
    expect(body.get('amount')).toBe('450.75');
    expect(body.get('categoryId')).toBe('2');
    expect(body.get('taxApplicable')).toBe('true');
    expect(body.get('status')).toBe('Pending Review');
    expect(body.get('attachment').name).toBe('bill.pdf');
  });

  test('shows the server error when saving fails', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { status: 400, data: { error: 'Date cannot be in the future' } } });
    renderPage(<ExpenseForm />, NEW);
    await screen.findByRole('option', { name: 'Travel' });
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /submit expense/i }));
    expect(await screen.findByText('Date cannot be in the future')).toBeVisible();
  });
});

describe('Duplicate warning', () => {
  test('warns about a matching expense and asks before saving', async () => {
    const user = userEvent.setup();
    const existing = expense({ id: 12, amount: 450.75, category: { id: 2, name: 'Travel' }, description: 'Cab' });
    mockGet(api, { '/expenses/duplicates': [existing] });
    api.post.mockResolvedValue({ data: expense({ id: 43 }) });
    renderPage(<ExpenseForm />, NEW);
    await screen.findByRole('option', { name: 'Travel' });
    await fillValid(user);

    expect(await screen.findByText(/possible duplicate/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Expense #12' })).toHaveAttribute('href', '/expenses/12');
    const [, { params }] = api.get.mock.calls.find(([url]) => url === '/expenses/duplicates');
    expect(params).toMatchObject({ amount: '450.75', categoryId: '2' });

    await user.click(screen.getByRole('button', { name: /submit expense/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Save a possible duplicate?');
    expect(api.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save anyway' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  });

  test('submitting straight after typing still checks for duplicates', async () => {
    const user = userEvent.setup();
    mockGet(api, { '/expenses/duplicates': [expense({ id: 12, amount: 450.75 })] });
    renderPage(<ExpenseForm />, NEW);
    await screen.findByRole('option', { name: 'Travel' });
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /submit expense/i })); // well within the 400 ms delay

    expect(await screen.findByRole('dialog')).toHaveTextContent('Save a possible duplicate?');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('editing ignores the expense being edited', async () => {
    mockGet(api, {
      '/expenses/9': expense({ id: 9, amount: 300, category: { id: 1, name: 'Food' } }),
      '/expenses/duplicates': [],
    });
    renderPage(<ExpenseForm />, { path: '/expenses/:id/edit', route: '/expenses/9/edit', user: USERS.superadmin });
    expect(await screen.findByDisplayValue('300')).toBeInTheDocument();
    await waitFor(() => expect(api.get.mock.calls.some(([url]) => url === '/expenses/duplicates')).toBe(true));
    const [, { params }] = api.get.mock.calls.find(([url]) => url === '/expenses/duplicates');
    expect(params.excludeId).toBe('9');
    expect(screen.queryByText(/possible duplicate/i)).not.toBeInTheDocument();
  });
});
