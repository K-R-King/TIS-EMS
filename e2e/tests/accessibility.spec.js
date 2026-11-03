import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Every main page must have no WCAG 2.1 AA violations (contrast, labels, names, structure), in both themes.
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const PAGES = [
  ['dashboard', '/', 'Monthly spend'],
  ['expense list', '/expenses', 'Expenses'],
  ['add expense', '/expenses/new', 'Expense details'],
  ['import', '/expenses/import', 'Download template'],
  ['users', '/users', 'Add user'],
  ['settings', '/settings', 'Payment modes'],
  ['account', '/account', 'Change password'],
];

async function violations(page) {
  const { violations: found } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return found.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`);
}

for (const theme of ['light', 'dark']) {
  test(`pages meet WCAG 2.1 AA in ${theme} mode`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: theme });
    await context.addInitScript((t) => window.localStorage.setItem('ems-theme', t), theme);
    const page = await context.newPage();

    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(await violations(page), 'login').toEqual([]);

    await page.getByLabel('Username').fill('superadmin');
    await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login$/);

    for (const [name, path, marker] of PAGES) {
      await page.goto(path);
      await expect(page.getByText(marker).first()).toBeVisible();
      expect(await violations(page), name).toEqual([]);
    }

    // Validation messages are shown too
    await page.goto('/expenses/new');
    await page.getByRole('button', { name: 'Submit expense' }).click();
    await expect(page.getByText('Amount is required.')).toBeVisible();
    expect(await violations(page), 'form errors').toEqual([]);
    await context.close();
  });
}
