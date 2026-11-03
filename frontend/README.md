# TIS-EMS frontend

React UI for the TIS Expense Management System, built with Vite. Setup and deployment are described in the
[main README](../README.md).

```bash
npm install
npm run dev        # http://localhost:3000, forwards /api to the backend on :8080
npm test           # Vitest + Testing Library
npm run lint       # ESLint (no warnings allowed)
npm run build      # production build in build/
```

`VITE_API_URL` overrides the API address at build time (default `/api`, same host as the app).
