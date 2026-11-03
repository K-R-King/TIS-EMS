# TIS-EMS — DevOps handoff

Everything on the development side of the "Architecture and Technology Stack" document is done: the app, Dockerfiles,
GitHub repository and GitHub Actions CI (build + test). This page covers what the DevOps team needs to push the images
to ECR and run them on the existing EKS cluster.

## Repository layout

One GitHub repository, `K-R-King/TIS-EMS`, with two independent projects:

```
backend/     Spring Boot API   -> image "ems-backend"
frontend/    React UI + nginx  -> image "ems-frontend"   (built with Vite on Node 24)
e2e/         Playwright end-to-end tests (run in CI against the docker compose stack)
.github/workflows/ci.yml       build, test, image build, end-to-end tests
docker-compose.yml             the full stack locally (MySQL + both images), same wiring as production
```

The requirements document suggests separate frontend and backend repositories. We kept one repository: the two parts
are versioned and released together, and CI tests them together (the smoke test logs in through the frontend's
proxy to the backend). Each folder builds on its own (`docker build backend`, `docker build frontend`), so CI and
image pipelines can treat them as separate projects by path. Splitting later is a `git subtree split` per folder.

## Images

| | Backend | Frontend |
|---|---|---|
| Build | `docker build -t ems-backend backend` | `docker build -t ems-frontend frontend` |
| Base | `eclipse-temurin:17-jre` | `nginx:1.27-alpine` |
| Port | 8080 | 80 |
| User | non-root (uid 1001) | nginx default |
| Liveness | `GET /actuator/health/liveness` | `GET /` |
| Readiness | `GET /actuator/health/readiness` (includes the database) | `GET /` |
| Startup | ~10–20 s (runs DB migrations first); use a startupProbe with ~60 s budget | instant |
| Suggested resources | request 500m CPU / 512Mi, limit 1Gi (heap is sized to 75% of the limit) | 50m / 64Mi |

Neither image contains secrets or environment-specific settings; everything below is injected at runtime.

## Configuration

### Backend

| Variable | Example | Notes |
|---|---|---|
| `DB_URL` | `jdbc:mysql://ems-db.xxxx.rds.amazonaws.com:3306/ems?sslMode=REQUIRED` | MySQL 8.x |
| `DB_USERNAME` | `ems_app` | Needs DDL rights on its schema (migrations run at startup) |
| `DB_PASSWORD` | — | **Secret** |
| `EMS_ALLOWED_ORIGINS` | `https://ems.techintello.com` | The public address of the UI |
| `EMS_INITIAL_ADMIN_PASSWORD` | — | **Secret.** Only used on the very first start, when the users table is empty, to create `superadmin`. Can be removed afterwards. |
| `SPRING_PROFILES_ACTIVE` | `prod` | Already the default in the image: JSON logs, `Secure` session cookie, honours `X-Forwarded-*` |
| `EMS_TIME_ZONE` | `Asia/Kolkata` | Default shown; business dates follow this zone, not the server's |

### Frontend

| Variable | Example | Notes |
|---|---|---|
| `BACKEND_URL` | `http://ems-backend:8080` | Where nginx forwards `/api/*` (the backend's Kubernetes Service) |

## Routing

The browser must reach the UI and the API on the **same host**; the login session is a first-party cookie.
Either of these works:

- **Through the frontend (simplest):** route everything for `ems.example.com` to the frontend Service; its nginx forwards
  `/api/` to `BACKEND_URL`.
- **At the ingress/ALB:** route `/api/*` to the backend Service and everything else to the frontend Service.

TLS terminates at the load balancer. Request bodies up to **12 MB** must be allowed (receipt uploads are capped at
10 MB), e.g. `nginx.ingress.kubernetes.io/proxy-body-size: 12m` with ingress-nginx. ALB has no relevant limit.

`/actuator/*` other than health is not exposed. Health endpoints don't need to be public through the ingress.
API documentation (Swagger UI, `/v3/api-docs`) is disabled in the `prod` profile; developers use it locally.

## State and scaling

- **Stateless pods.** Login sessions (Spring Session JDBC) and receipt files are stored in MySQL, so any replica can
  serve any request: no sticky sessions, no shared volumes. Scale the backend horizontally as needed.
- **Database migrations** (Flyway) run automatically when the backend starts. Flyway takes a database lock, so several
  replicas starting at once is safe. Schema history is in the `flyway_schema_history` table.
- **Backups:** the database is the only state. Receipts are inside it (`expense_attachments`), so it will grow with use;
  plan RDS storage and snapshots accordingly. If volume becomes large, receipts can move to S3 (a contained change
  in `AttachmentService`).
- **Graceful shutdown** is enabled; give pods a `terminationGracePeriodSeconds` of 30.

## Logs and monitoring

With the `prod` profile the backend logs one JSON object per line to stdout (Elastic Common Schema), ready for
CloudWatch Container Insights / Fluent Bit. Notable events: account lockouts are logged at WARN by
`LoginAttemptListener`. nginx logs to stdout/stderr in its default format.

## CI today and what to add

`.github/workflows/ci.yml` runs on every push and pull request:

1. `backend`: `./mvnw verify` on JDK 17, including the Flyway migrations against a real MySQL 8.4 (Testcontainers).
2. `frontend`: `npm ci`, ESLint, component tests, production build.
3. `e2e`: builds both images, starts them with MySQL via docker compose, waits for readiness, then runs the Playwright
   end-to-end suite in Chromium through the frontend (the same images DevOps will deploy).

Still to be added by DevOps, per the deployment plan: push images to ECR (e.g. tag with the commit SHA), deploy to EKS
(Deployments, Services, Ingress, Secrets), CloudWatch monitoring, DNS and TLS for the production hostname, and RDS
backups.

## First deployment checklist

1. Create the MySQL database and an app user; store `DB_PASSWORD` and `EMS_INITIAL_ADMIN_PASSWORD` as Kubernetes Secrets.
2. Deploy the backend; wait for readiness (migrations create all tables and default dropdown values).
3. Deploy the frontend with `BACKEND_URL` pointing at the backend Service; set `EMS_ALLOWED_ORIGINS` to the public URL.
4. Log in as `superadmin` with the initial password, change it under **Account**, and create the real users.

Questions about the application: Karthik Reddy (repository owner).
