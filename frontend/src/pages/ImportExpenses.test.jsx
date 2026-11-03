import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import api from '../api';
import ImportExpenses from './ImportExpenses';
import { renderPage } from '../test/utils';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (e, fallback) => e.response?.data?.error || fallback,
}));

const xlsx = () => new File(['data'], 'expenses.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

test('lists every problem row when the file is rejected', async () => {
  const user = userEvent.setup();
  api.post.mockRejectedValue({ response: { status: 400, data: {
    error: '2 problem(s) found. Nothing was imported.',
    details: ['Row 3: Amount "abc" is not a number', 'Row 5: Category "Fuel" does not exist (see Settings)'],
    onlyDuplicates: false,
  } } });
  renderPage(<ImportExpenses />, { path: '/expenses/import' });
  await user.upload(screen.getByLabelText(/choose an excel file/i), xlsx());
  await user.click(screen.getByRole('button', { name: /^import$/i }));

  expect(await screen.findByText('2 problem(s) found. Nothing was imported.')).toBeVisible();
  expect(screen.getByText('Row 5: Category "Fuel" does not exist (see Settings)')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Import anyway' })).not.toBeInTheDocument();
});

test('possible duplicates can be imported after confirming', async () => {
  const user = userEvent.setup();
  api.post
    .mockRejectedValueOnce({ response: { status: 400, data: {
      error: '1 row(s) look like duplicates. Nothing was imported.',
      details: ['Row 2: Same date, amount and category as existing expense #12'],
      onlyDuplicates: true,
    } } })
    .mockResolvedValueOnce({ data: { imported: 4 } });
  renderPage(<ImportExpenses />, { path: '/expenses/import' });
  await user.upload(screen.getByLabelText(/choose an excel file/i), xlsx());
  await user.click(screen.getByRole('button', { name: /^import$/i }));

  await user.click(await screen.findByRole('button', { name: 'Import anyway' }));

  expect(await screen.findByText(/Imported 4 expenses/)).toBeVisible();
  const [, retry] = api.post.mock.calls[1];
  expect(retry.get('allowDuplicates')).toBe('true');
  expect(retry.get('file').name).toBe('expenses.xlsx');
});
