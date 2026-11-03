// Applies the saved light/dark theme before the page is drawn, so dark mode does not flash light first.
// A separate file (not inline) because the Content-Security-Policy only allows scripts from this site.
(function () {
  var theme;
  try {
    theme = localStorage.getItem('ems-theme');
  } catch {
    // storage blocked: fall back to the system setting
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-bs-theme', theme);
})();
