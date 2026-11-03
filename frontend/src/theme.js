import { useEffect, useState } from 'react';

const KEY = 'ems-theme';

function initialTheme() {
  // Normally already set by public/theme-init.js before the page was drawn
  const applied = document.documentElement.getAttribute('data-bs-theme');
  if (applied === 'light' || applied === 'dark') return applied;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be blocked; fall back to the system setting
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Light/dark theme, applied through Bootstrap's data-bs-theme attribute and remembered per browser. */
export default function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Not remembering the choice is fine
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
