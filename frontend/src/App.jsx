import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireRole } from './auth';
import { ROLES } from './roles';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExpenseList from './pages/ExpenseList';
import ExpenseForm from './pages/ExpenseForm';
import ExpenseDetails from './pages/ExpenseDetails';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Account from './pages/Account';
import ImportExpenses from './pages/ImportExpenses';

const ADMINS = [ROLES.SUPERADMIN, ROLES.ADMIN];

/** Page chrome shared by every screen behind the login. */
function Protected({ roles, children }) {
  return (
    <RequireAuth>
      <Layout>
        <RequireRole roles={roles}>{children}</RequireRole>
      </Layout>
    </RequireAuth>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/expenses" element={<Protected><ExpenseList /></Protected>} />
          <Route path="/expenses/new" element={<Protected roles={ADMINS}><ExpenseForm /></Protected>} />
          <Route path="/expenses/import" element={<Protected roles={ADMINS}><ImportExpenses /></Protected>} />
          <Route path="/expenses/:id" element={<Protected><ExpenseDetails /></Protected>} />
          <Route path="/expenses/:id/edit" element={<Protected roles={ADMINS}><ExpenseForm /></Protected>} />
          <Route path="/users" element={<Protected roles={[ROLES.SUPERADMIN]}><Users /></Protected>} />
          <Route path="/settings" element={<Protected roles={[ROLES.SUPERADMIN]}><Settings /></Protected>} />
          <Route path="/account" element={<Protected><Account /></Protected>} />
          {/* Old link from the first version of the app */}
          <Route path="/expense" element={<Navigate to="/expenses/new" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
