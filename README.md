# TIS-EMS — Expense Management System

An internal web app for entering, reviewing and tracking company expenses (replacing the Excel sheet).

| Folder | What | Runs on |
|---|---|---|
| `backend/` | Java 17 + Spring Boot REST API, Flyway migrations | http://localhost:8080 |
| `frontend/` | React + Bootstrap + Axios | http://localhost:3000 |
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
  a Super Admin can unlock it. Everyone can change their own password under **Account**.
- Dashboard: totals, this month vs last month, 6-month trend, spend by category and status, recent expenses.
- Expenses: add/edit with receipt upload (PDF/JPG/PNG, 10 MB), list with filters (date range, category, payment mode,
  reimbursement type, status), search and paging, details with receipt preview, manager review comments, and an
  activity history of every change.
- Excel import with a downloadable template; a file with any bad row is rejected with row-by-row reasons.
- User Management and Settings (Super Admin only). Light and dark theme.

## Local development

Requirements: Java 17+, Node.js 18+, MySQL 8 (macOS: `brew install openjdk@17 node mysql && brew services start mysql`).

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
npm start                                       # http://localhost:3000
```

The React dev server forwards `/api` to the backend (`"proxy"` in `frontend/package.json`), so the app and API share
one address, as in production.

On first start with an empty `users` table the backend creates a `superadmin` account and prints its generated
password in the log once. Set `EMS_INITIAL_ADMIN_PASSWORD` beforehand to choose it. Create everyone else under
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
cd frontend && CI=true npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs both suites, builds the production frontend, then builds the Docker
images, starts the full stack with docker compose, and logs in through it. Dependabot opens weekly update PRs.

## Run the whole stack in Docker

```bash
DB_PASSWORD=choose-one EMS_INITIAL_ADMIN_PASSWORD=choose-another docker compose up --build
```

Open http://localhost:3000 and log in as `superadmin`. nginx in the frontend container serves the UI and forwards
`/api` to the backend.

## Free demo deployment (Vercel + Render + Aiven)

For letting someone try the app before the AWS deployment. All three have free plans that need no credit card.
The free backend sleeps after 15 minutes without traffic; the first request after that takes about a minute.

1. **Database (Aiven):** create a free MySQL service at https://aiven.io. From its overview page note the host, port,
   user (`avnadmin`) and password.
2. **Backend (Render):** at https://render.com choose **New → Blueprint**, connect this GitHub repo, and it picks up
   `render.yaml`. Fill in:
   - `DB_URL` = `jdbc:mysql://HOST:PORT/defaultdb?sslMode=REQUIRED`
   - `DB_USERNAME` = `avnadmin`, `DB_PASSWORD` = the Aiven password
   - `EMS_INITIAL_ADMIN_PASSWORD` = the password you will log in with as `superadmin`
   - `EMS_ALLOWED_ORIGINS` = your Vercel address (step 3; you can fill it in afterwards)

   Wait until `https://tis-ems-api.onrender.com/actuator/health` shows `{"status":"UP"}`. If Render gave the service
   a different address, change the URL in `frontend/vercel.json` to match and push.
3. **Frontend (Vercel):** at https://vercel.com choose **Add New → Project**, import this repo, set **Root Directory**
   to `frontend`, and deploy. Vercel serves the app and forwards `/api` to Render (`frontend/vercel.json`).
4. Put the Vercel address into Render's `EMS_ALLOWED_ORIGINS`, open the Vercel address and log in as `superadmin`.

Receipts and sessions are stored in the database, so nothing is lost when Render restarts the free backend.

## API overview

All endpoints are under `/api` and need a logged-in session (or an `Authorization: Basic` header).

| Endpoint | Who |
|---|---|
| `POST /auth/login` (Basic auth), `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password` | anyone / logged in |
| `GET /expenses` (filters `from`, `to`, `categoryId`, `paymentModeId`, `reimbursementTypeId`, `status`, `q`; paging `page`, `size`), `GET /expenses/{id}`, `/{id}/attachment`, `/{id}/history`, `/stats` | all roles |
| `GET`/`POST /expenses/{id}/comments` | all roles |
| `POST /expenses`, `PUT /expenses/{id}` (multipart), `DELETE /expenses/{id}`, `POST /expenses/import`, `GET /expenses/import/template` | Super Admin, Expense Admin |
| `GET /dropdowns/{categories,payment-modes,reimbursement-types,statuses}` | all roles |
| `/users` (CRUD, `POST /users/{id}/unlock`), `/settings/{categories,payment-modes,reimbursement-types}` | Super Admin |
| `GET /actuator/health/liveness`, `/actuator/health/readiness` (not under `/api`) | public |
