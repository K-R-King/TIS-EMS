import { expect, test } from '@playwright/test';

// One story through the app, in order: the Super Admin sets up people, an Expense Admin enters an expense,
// a Manager reviews it, and the admin approves it. Unique names let the suite run against any database.
test.describe.configure({ mode: 'serial' });

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const run = Date.now().toString(36);
const people = {
  admin: { name: `E2E Admin ${run}`, username: `e2e-admin-${run}`, password: 'e2e-admin-pass', role: 'Expense Admin' },
  manager: { name: `E2E Manager ${run}`, username: `e2e-mgr-${run}`, password: 'e2e-manager-pass', role: 'Manager' },
};
const description = `E2E client dinner ${run}`;
const amount = `${(Date.now() % 90000) + 1000}.25`; // unique per run, so no duplicate warnings from earlier runs
let expenseUrl;

test.beforeAll(() => {
  if (!ADMIN_PASSWORD) throw new Error('Set E2E_ADMIN_PASSWORD to the superadmin password of the running stack');
});

/** Submits the login form without checking the outcome. */
async function attemptLogIn(page, username, password) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Logs in and waits until the app has moved past the login page. */
async function logIn(page, username, password) {
  await attemptLogIn(page, username, password);
  await expect(page).not.toHaveURL(/\/login$/);
}

/** Click an entry in the sidebar. */
function sidebar(page, name) {
  return page.getByLabel('Main navigation').getByRole('link', { name, exact: true });
}

async function logOut(page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test('super admin creates an expense admin and a manager', async ({ page }) => {
  await logIn(page, 'superadmin', ADMIN_PASSWORD);
  await expect(page.getByRole('heading', { name: /^Hello/ })).toBeVisible();

  await sidebar(page, 'Users').click();
  for (const person of Object.values(people)) {
    await page.getByRole('button', { name: 'Add user' }).click();
    await page.getByLabel('Full name').fill(person.name);
    await page.getByLabel(/^Username/).fill(person.username);
    await page.getByLabel(/^Password/).fill(person.password);
    await page.getByLabel('Role').selectOption({ label: person.role });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`${person.username} added.`)).toBeVisible();
  }
  await logOut(page);
});

test('protected pages send logged-out visitors to the login page', async ({ page }) => {
  await page.goto('/expenses/new');
  await expect(page).toHaveURL(/\/login$/);
});

test('expense admin adds an expense with a receipt', async ({ page }) => {
  await logIn(page, people.admin.username, people.admin.password);
  await sidebar(page, 'Add Expense').click();

  await page.getByLabel('Amount').fill(amount);
  await page.getByLabel('Expense category').selectOption({ label: 'Travel' });
  await page.getByLabel('Payment mode').selectOption({ label: 'UPI' });
  await page.getByLabel(/Tax applicable/).check();
  await page.getByLabel('Description / comments').fill(description);
  await page.locator('#attachment').setInputFiles({
    name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% e2e receipt\n'),
  });
  await page.getByRole('button', { name: 'Submit expense' }).click();

  await expect(page.getByText('Expense created. It is now pending review.')).toBeVisible();
  await expect(page.getByText('receipt.pdf')).toBeVisible();
  await expect(page.getByText(`Entered by ${people.admin.name}`)).toBeVisible();
  expenseUrl = page.url();

  // Entering the same date, amount and category again triggers the duplicate warning
  await page.goto('/expenses/new');
  await page.getByLabel('Amount').fill(amount);
  await page.getByLabel('Expense category').selectOption({ label: 'Travel' });
  await expect(page.getByText(/Possible duplicate/)).toBeVisible();
  await page.getByRole('button', { name: 'Submit expense' }).click();
  await expect(page.getByRole('dialog')).toContainText('Save a possible duplicate?');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // It shows up in the list, and filters narrow it down
  await sidebar(page, 'Expenses').click();
  await page.getByLabel('Search').fill(run);
  await expect(page.getByRole('cell', { name: description })).toBeVisible();
  await page.getByLabel('Status').selectOption('Approved');
  await expect(page.getByText('No expenses match these filters')).toBeVisible();
  await logOut(page);
});

test('manager can review and comment but not edit', async ({ page }) => {
  await logIn(page, people.manager.username, people.manager.password);
  await expect(page).toHaveURL(/\/expenses$/); // managers land on the expense list
  await expect(sidebar(page, 'Add Expense')).toHaveCount(0);

  await page.goto(expenseUrl);
  await expect(page.getByText(description)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
  await page.getByLabel('Add a comment').fill('Please attach the GST invoice.');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect(page.getByText('Please attach the GST invoice.')).toBeVisible();

  await page.goto('/users');
  await expect(page.getByText('You do not have access to this page.')).toBeVisible();
  await logOut(page);
});

test('expense admin approves it and the change is recorded', async ({ page }) => {
  await logIn(page, people.admin.username, people.admin.password);
  await page.goto(expenseUrl);
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Status').selectOption('Approved');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Expense updated.')).toBeVisible();
  await expect(page.getByText('Status: Pending Review → Approved')).toBeVisible();
  await expect(page.getByText(`${people.manager.name} · `)).toBeVisible(); // the manager's comment is kept
  await logOut(page);
});

test('five wrong passwords lock an account until a super admin unlocks it', async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await attemptLogIn(page, people.manager.username, 'wrong-password');
    await expect(page.getByRole('alert')).toBeVisible();
  }
  await attemptLogIn(page, people.manager.username, people.manager.password);
  await expect(page.getByRole('alert')).toContainText('locked');

  await logIn(page, 'superadmin', ADMIN_PASSWORD);
  await sidebar(page, 'Users').click();
  const row = page.getByRole('row', { name: new RegExp(people.manager.username) });
  await row.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByText(`${people.manager.username} can log in again.`)).toBeVisible();
  await logOut(page);

  await logIn(page, people.manager.username, people.manager.password);
  await expect(page).toHaveURL(/\/expenses$/);
});

test('a deactivated account is logged out and cannot log back in', async ({ browser, page }) => {
  // The manager is logged in somewhere else...
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await logIn(managerPage, people.manager.username, people.manager.password);

  // ...when the super admin deactivates the account
  await logIn(page, 'superadmin', ADMIN_PASSWORD);
  await sidebar(page, 'Users').click();
  await page.getByRole('button', { name: `Deactivate ${people.manager.username}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByText(`${people.manager.username} is deactivated and has been logged out.`)).toBeVisible();

  // The manager's next action sends them to the login page, and logging in is refused
  await managerPage.getByLabel('Main navigation').getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(managerPage).toHaveURL(/\/login$/);
  await attemptLogIn(managerPage, people.manager.username, people.manager.password);
  await expect(managerPage.getByRole('alert')).toContainText('deactivated');
  await managerContext.close();

  // Their review comment is still on the expense
  await page.goto(expenseUrl);
  await expect(page.getByText('Please attach the GST invoice.')).toBeVisible();
});
