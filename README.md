# TIS-EMS — Expense Management System

A full-stack internal expense management app.

- **Frontend:** React (`Frontend/my-app - Copy`), runs on http://localhost:3000
- **Backend:** Java 17 + Spring Boot (`Backend/EMS-attempt - Copy`), runs on http://localhost:8080
- **Database:** MySQL 8 (database name `mydatabase`)

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

The backend creates the tables on its own (`spring.jpa.hibernate.ddl-auto=update`), but the starting data
(users, categories, reimbursement types, payment modes) has to be loaded from a database export.

Import a dump made with `mysqldump --databases mydatabase`:

```bash
mysql -uroot -p < TIS-EMS-database.sql
```

> Never commit a database dump to this repository: it contains user credentials. `*.sql` is in `.gitignore`.

## 3. Run the backend

The MySQL password is read from the `DB_PASSWORD` environment variable (username `root`, database `mydatabase`
on `localhost:3306`, see `src/main/resources/application.properties`).

macOS / Linux:

```bash
cd "Backend/EMS-attempt - Copy"
export DB_PASSWORD='your-mysql-root-password'   # use '' if root has no password
./mvnw spring-boot:run
```

Windows (PowerShell):

```powershell
cd "Backend\EMS-attempt - Copy"
$env:DB_PASSWORD = 'your-mysql-root-password'
.\mvnw.cmd spring-boot:run
```

Wait for `Started EmsApplication`.

## 4. Run the frontend

In a second terminal:

```bash
cd "Frontend/my-app - Copy"
npm install
npm start
```

Open http://localhost:3000 and log in with a user from the `users` table.

## Working across computers

```bash
git pull                 # before you start
git add -A
git commit -m "message"
git push                 # when you're done
```
