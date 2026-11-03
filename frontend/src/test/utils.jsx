import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../useAuth';

export const USERS = {
  admin: { id: 2, name: 'Arjun Admin', username: 'arjun', role: 'ADMIN' },
  manager: { id: 3, name: 'Mo Manager', username: 'mo', role: 'MANAGER' },
  superadmin: { id: 1, name: 'Erin Super', username: 'erin', role: 'SUPERADMIN' },
};

export const LISTS = {
  '/dropdowns/categories': [{ id: 1, name: 'Food' }, { id: 2, name: 'Travel' }],
  '/dropdowns/payment-modes': [{ id: 1, name: 'UPI' }],
  '/dropdowns/reimbursement-types': [{ id: 1, name: 'Company Paid' }],
  '/dropdowns/statuses': ['Pending Review', 'Approved', 'Rejected', 'Reimbursed'],
};

export function expense(overrides = {}) {
  return {
    id: 7, date: '2026-10-01', amount: 1250.5, category: { id: 1, name: 'Food' }, paymentMode: { id: 1, name: 'UPI' },
    reimbursementType: null, taxApplicable: false, description: 'Team lunch', status: 'Pending Review',
    enteredBy: USERS.admin, attachmentName: null, attachmentContentType: null,
    createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', ...overrides,
  };
}

/** api.get mock answering from a { url: data } map (falling back to the dropdown lists). */
export function mockGet(api, routes = {}) {
  api.get.mockImplementation((url, config) => {
    const answer = { ...LISTS, ...routes }[url];
    if (answer === undefined) return Promise.reject(new Error(`Unexpected GET ${url}`));
    const data = typeof answer === 'function' ? answer(config) : answer;
    return data instanceof Error ? Promise.reject(data) : Promise.resolve({ data });
  });
}

/** Shows the current URL so tests can assert navigation. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/** Renders a page as a logged-in user at the given URL. */
export function renderPage(element, { user = USERS.admin, path = '/', route = path } = {}) {
  const auth = { user, checking: false, loggedOut: false, login: vi.fn(), logout: vi.fn() };
  const result = render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AuthContext.Provider>
  );
  return { ...result, auth };
}
