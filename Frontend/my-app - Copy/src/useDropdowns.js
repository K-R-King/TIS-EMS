import { useCallback, useEffect, useState } from 'react';
import api from './api';

const EMPTY = { categories: [], paymentModes: [], reimbursementTypes: [], statuses: [] };

/** Loads the dropdown lists used by the expense form, filters and settings screens. */
export default function useDropdowns() {
  const [lists, setLists] = useState(EMPTY);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [c, p, r, s] = await Promise.all([
        api.get('/dropdowns/categories'),
        api.get('/dropdowns/payment-modes'),
        api.get('/dropdowns/reimbursement-types'),
        api.get('/dropdowns/statuses'),
      ]);
      setLists({ categories: c.data, paymentModes: p.data, reimbursementTypes: r.data, statuses: s.data });
      setError('');
    } catch {
      setError('Could not load dropdown lists.');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...lists, error, reload };
}
