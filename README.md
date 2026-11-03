# TIS-EMS — Expense Management System

An internal web app for entering, reviewing and tracking company expenses (replacing the Excel sheet).

- **Frontend:** React + Bootstrap + Axios (`Frontend/my-app - Copy`), runs on http://localhost:3000
- **Backend:** Java 17 + Spring Boot REST API (`Backend/EMS-attempt - Copy`), runs on http://localhost:8080
- **Database:** MySQL 8 (database name `mydatabase`)

## Roles

| Role (stored value) | Can do |
|---|---|
| Super Admin (`SUPERADMIN`) | Everything, plus User Management and Settings (dropdown lists) |
| Expense Admin (`ADMIN`) | Add, edit and delete expenses; view all expenses |
| Manager (`MANAGER`) | View expenses and add review comments; cannot edit or delete |

The backend enforces these rules on every API call; the UI only hides what a role cannot use.

## Screens

Login · Dashboard (totals, by category, recent) · Add/Edit Expense · Expense List (filters: date range, category,
payment mode, reimbursement type, status, plus text search) · Expense Details (receipt preview, review comments) ·
User Management · Settings.

## Requirements

- Java 17 or newer
- Node.js 18 or newer (with npm)
- MySQL 8

macOS (Homebrew):

```bash
brew install openjdk@17 node mysql
brew services start mysql
```

Windows: install the JDK, Node.js and MySQL Installer from their official sites.

## 1. Get the code

```bash
git clone https://github.com/K-R-King/TIS-EMS.git
cd TIS-EMS
```

## 2. Set up the database

```sql
CREATE DATABASE mydatabase;
```

That is all. On startup the backend creates the tables, fills empty dropdown lists with the defaults
(Travel, Hotel, Food, … / Cash, Credit Card, UPI, Bank Transfer / Personal Reimbursement, Company Paid, Advance
Cleared), and, if there are no users, creates a `superadmin` account (see below).

Passwords are stored as BCrypt hashes. Any account whose password is still in plain text (from older versions of
this app or an old database dump) is hashed automatically on startup; the password itself stays the same.

> Never commit a database dump to this repository: it contains user credentials. `*.sql` is in `.gitignore`.

## 3. Run the backend

```bash
cd "Backend/EMS-attempt - Copy"
export DB_PASSWORD='your-mysql-root-password'   # omit if root has no password
./mvnw spring-boot:run
```

Windows (PowerShell): `$env:DB_PASSWORD = '...'` then `.\mvnw.cmd spring-boot:run`.

Wait for `Started EmsApplication`. With an empty `users` table the log prints the generated `superadmin` password
once; set `EMS_INITIAL_ADMIN_PASSWORD` beforehand to choose it instead. Create the other users from
**Users** in the app.

Settings (environment variables):

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/mydatabase` | Database |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / empty | Database login |
| `EMS_UPLOAD_DIR` | `uploads` | Where receipt files are stored |
| `EMS_ALLOWED_ORIGINS` | `http://localhost:3000` | Frontend address(es), comma-separated |
| `EMS_INITIAL_ADMIN_PASSWORD` | random | Password for the first `superadmin` |

## 4. Run the frontend

In a second terminal:

```bash
cd "Frontend/my-app - Copy"
npm install
npm start
```

Open http://localhost:3000. To point the UI at another API address, set `REACT_APP_API_URL`
(default `http://localhost:8080/api`).

## Tests

```bash
cd "Backend/EMS-attempt - Copy" && ./mvnw test        # uses an in-memory H2 database, no MySQL needed
cd "Frontend/my-app - Copy" && CI=true npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs both test suites, the production build, and builds the Docker
images on every push to `main` and every pull request.

## Docker

```bash
DB_PASSWORD=choose-one EMS_INITIAL_ADMIN_PASSWORD=choose-another docker compose up --build
```

This starts MySQL, the backend (http://localhost:8080) and the frontend (http://localhost:3000). The images in
`Backend/EMS-attempt - Copy/Dockerfile` and `Frontend/my-app - Copy/Dockerfile` are what DevOps pushes to ECR for the
EKS deployment. The frontend image takes the API address at build time:
`docker build --build-arg REACT_APP_API_URL=https://ems-api.example.com/api ...`. The backend needs a persistent
volume at `/app/uploads` for receipts.

## API overview

All endpoints are under `/api` and need a logged-in session (or an `Authorization: Basic` header).

| Endpoint | Who |
|---|---|
| `POST /auth/login` (Basic auth), `GET /auth/me`, `POST /auth/logout` | anyone |
| `GET /expenses` (filters: `from`, `to`, `categoryId`, `paymentModeId`, `reimbursementTypeId`, `status`, `q`), `GET /expenses/{id}`, `GET /expenses/{id}/attachment`, `GET /expenses/stats` | all roles |
| `GET`/`POST /expenses/{id}/comments` | all roles |
| `POST /expenses`, `PUT /expenses/{id}` (multipart), `DELETE /expenses/{id}` | Super Admin, Expense Admin |
| `GET /dropdowns/{categories,payment-modes,reimbursement-types,statuses}` | all roles |
| `/users` (CRUD), `/settings/{categories,payment-modes,reimbursement-types}` (create/rename/delete) | Super Admin |

## Working across computers

```bash
git pull                 # before you start
git add -A
git commit -m "message"
git push                 # when you're done
```
