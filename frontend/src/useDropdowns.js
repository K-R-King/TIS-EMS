import { useCallback, useEffect, useState } from 'react';
import api from './api';

const EMPTY = { categories: [], paymentModes: [], reimbursementTypes: [], statuses: [] };

async function fetchLists() {
  const [c, p, r, s] = await Promise.all([
    api.get('/dropdowns/categories'),
    api.get('/dropdowns/payment-modes'),
    api.get('/dropdowns/reimbursement-types'),
    api.get('/dropdowns/statuses'),
  ]);
  return { categories: c.data, paymentModes: p.data, reimbursementTypes: r.data, statuses: s.data };
}

/** Loads the dropdown lists used by the expense form, filters and settings screens. */
export default function useDropdowns() {
  const [lists, setLists] = useState(EMPTY);
  const [error, setError] = useState('');

  const apply = useCallback((promise) => promise
    .then((data) => { setLists(data); setError(''); })
    .catch(() => setError('Could not load dropdown lists.')), []);

  useEffect(() => {
    apply(fetchLists());
  }, [apply]);

  const reload = useCallback(() => apply(fetchLists()), [apply]);

  return { ...lists, error, reload };
}
