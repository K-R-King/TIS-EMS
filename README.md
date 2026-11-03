# TIS-EMS — Expense Management System

An internal web app for entering, reviewing and tracking company expenses (replacing the Excel sheet).

| Folder | What | Runs on |
|---|---|---|
| `backend/` | Java 17 + Spring Boot REST API, Flyway migrations | http://localhost:8080 |
| `frontend/` | React + Bootstrap + Axios, built with Vite | http://localhost:3000 |
| `e2e/` | Playwright end-to-end tests | — |
| — | MySQL 8, database `mydatabase` | localhost:3306 |

Deploying to AWS is handled by DevOps; see **[HANDOFF.md](HANDOFF.md)**.

## Roles

| Role (stored value) | Can do |
|---|---|
| Super Admin (`SUPERADMIN`) | Everything, plus User Management and Settings (dropdown lists) |
| Expense Admin (`ADMIN`) | Add, edit, delete and import expenses; view all expenses |
| Manager (`MANAGER`) | View expenses and add review comments; cannot edit or delete |

The backend enforces these rules on every API call; the UI only hides what a role cannot use.

## Features

- Login (username/password, BCrypt-hashed, server-side session). 5 wrong passwords lock an account for 15 minutes;
  a Super Admin can unlock it. Everyone can change their own password under **Account** (which logs out their other
  sessions).
- Accounts that appear on expenses, comments or history can't be deleted (audit trail); a Super Admin **deactivates**
  them instead. Deactivating, deleting, or changing someone's role or password ends their open sessions at once.
- Dashboard: totals, this month vs last month, 6-month trend, spend by category and status, recent expenses.
- Expenses: add/edit with receipt upload (PDF/JPG/PNG, 10 MB), list with filters (date range, category, payment mode,
  reimbursement type, status), search and paging, details with receipt preview, manager review comments, and an
  activity history of every change.
- Excel import with a downloadable template; a file with any bad row is rejected with row-by-row reasons.
- Duplicate warning: entering (or importing) an expense with the same date, amount and category as an existing one
  asks for confirmation first.
- User Management and Settings (Super Admin only). Light and dark theme.

## Local development

Requirements: Java 17+, Node.js 22.12+ (24 LTS recommended), MySQL 8
(macOS: `brew install openjdk@17 node mysql && brew services start mysql`).

```bash
# 1. Database (tables are created by the backend's migrations)
mysql -uroot -e "CREATE DATABASE mydatabase"

# 2. Backend
cd backend
export DB_PASSWORD='your-mysql-root-password'   # omit if root has no password
./mvnw spring-boot:run                          # Windows: .\mvnw.cmd spring-boot:run

# 3. Frontend (second terminal)
cd frontend
npm install
npm run dev                                     # http://localhost:3000
```

The Vite dev server forwards `/api` to the backend (`frontend/vite.config.js`), so the app and API share one address,
as in production.

API documentation (Swagger UI) is at http://localhost:8080/swagger-ui.html while the backend runs locally; use
**Authorize** with a username and password to try requests. It is switched off in the `prod` profile.

On first start with an empty `users` table the backend creates a `superadmin` account and prints its generated
password in the log once. Set `EMS_INITIAL_ADMIN_PASSWORD` beforehand to choose it (required with the `prod` profile,
which is what Docker uses, so a password never ends up in production logs). Create everyone else under
**Users**. Default dropdown values (Travel, Hotel, … / Cash, UPI, … / Personal Reimbursement, …) are added automatically.

### Database changes

The schema is managed by Flyway (`backend/src/main/resources/db/migration`). To change it, add a new
`V3__what_changed.sql` file and update the entity classes; never edit a migration that has already run. Hibernate only
validates the schema (`ddl-auto=validate`), so a mismatch stops the app at startup instead of silently altering tables.

Databases created by versions of this app from before Flyway are detected and upgraded automatically.

### Configuration (backend environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/mydatabase` | Database |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / empty | Database login |
| `EMS_INITIAL_ADMIN_PASSWORD` | random, printed once | Password for the first `superadmin` |
| `EMS_ALLOWED_ORIGINS` | `http://localhost:3000` | Address(es) the UI is served from, comma-separated |
| `EMS_TIME_ZONE` | `Asia/Kolkata` | Time zone for "today" and "this month" |
| `SPRING_PROFILES_ACTIVE` | — | `prod` in deployed environments: JSON logs, secure cookies, proxy headers |
| `PORT` | `8080` | HTTP port |

## Tests

```bash
cd backend && ./mvnw test        # API tests on in-memory H2, plus the real migrations on MySQL in Docker (skipped without Docker)
cd frontend && npm test          # component tests (Vitest + Testing Library); npm run lint for ESLint
```

End-to-end tests drive a real browser through the whole app (Super Admin creates users, an Expense Admin adds an
expense with a receipt, a Manager reviews it, the admin approves it, account lockout and unlock). They run against the
Docker stack and create their own uniquely named users and expenses:

```bash
DB_PASSWORD=pw EMS_INITIAL_ADMIN_PASSWORD=admin-pw docker compose up -d --build
cd e2e && npm install && npx playwright install chromium
E2E_ADMIN_PASSWORD=admin-pw npx playwright test
docker compose down -v                                   # removes the test database
```

GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests, frontend lint/tests/build, then builds the Docker
images, starts the full stack and runs the end-to-end tests against it (the Playwright report is attached when a
test fails). Dependabot opens update PRs.

## Run the whole stack in Docker

```bash
DB_PASSWORD=choose-one EMS_INITIAL_ADMIN_PASSWORD=choose-another docker compose up --build
```

Open http://localhost:3000 and log in as `superadmin`. nginx in the frontend container serves the UI and forwards
`/api` to the backend.

## API overview

All endpoints are under `/api` and need a logged-in session (or an `Authorization: Basic` header).

| Endpoint | Who |
|---|---|
| `POST /auth/login` (Basic auth), `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password` | anyone / logged in |
| `GET /expenses/duplicates?date&amount&categoryId[&excludeId]` | all roles |
| `GET /expenses` (filters `from`, `to`, `categoryId`, `paymentModeId`, `reimbursementTypeId`, `status`, `q`; paging `page`, `size`), `GET /expenses/{id}`, `/{id}/attachment`, `/{id}/history`, `/stats` | all roles |
| `GET`/`POST /expenses/{id}/comments` | all roles |
| `POST /expenses`, `PUT /expenses/{id}` (multipart), `DELETE /expenses/{id}`, `POST /expenses/import` (`allowDuplicates`), `GET /expenses/import/template` | Super Admin, Expense Admin |
| `GET /dropdowns/{categories,payment-modes,reimbursement-types,statuses}` | all roles |
| `/users` (CRUD, `POST /users/{id}/unlock`, `/deactivate`, `/activate`), `/settings/{categories,payment-modes,reimbursement-types}` | Super Admin |
| `GET /actuator/health/liveness`, `/actuator/health/readiness` (not under `/api`) | public |
