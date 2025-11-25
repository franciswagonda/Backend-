# UCU Innovators Hub Backend

A Node.js + Express + Sequelize REST API powering the UCU Innovators Hub: project submission, moderation, analytics, and discovery for student innovation.

## Features
- User registration/login with JWT authentication
- Roles: `student`, `supervisor`, `admin`
- Project submission with document upload (PDF/DOC/DOCX)
- Moderation workflow (pending → approved/rejected)
- Comment threads per project
- Public project gallery with filtering (category, technology, faculty, department, year)
- Project view tracking + dashboard analytics (status counts, faculty distribution, trending technologies, active innovators)

## Tech Stack
- Runtime: Node.js / Express
- ORM: Sequelize (MySQL dialect)
- DB: MySQL (`mysql2` driver)
- Auth: JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)
- File Uploads: Multer
- Env Management: dotenv

## Architecture & Theory
For an in-depth overview of patterns, data model, security, analytics, and extensibility strategies see:
- [`docs/working-theories.md`](./docs/working-theories.md)

## Project Structure
```
models/           # Sequelize models + associations
controllers/      # Request handlers (auth, projects, dashboard)
routes/           # Express routers (auth, projects, dashboard)
middleware/       # Auth + upload middleware
docs/             # Architecture + theory documentation
uploads/          # Stored uploaded documents
server.js         # App entry point
```

## Environment Variables
Copy `.env.example` to `.env` and configure:
```powershell
cp .env.example .env
```
Required variables:
```
PORT=5000
NODE_ENV=production
LOG_FORMAT=combined
DB_HOST=localhost
DB_NAME=ucu_innovators
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_SYNC_ALTER=false
JWT_SECRET=your_jwt_secret_string
RATE_WINDOW_MINUTES=15
RATE_MAX_REQUESTS=100
```
**Production critical**: Set `DB_SYNC_ALTER=false` and use migrations. Generate a strong `JWT_SECRET` (32+ chars random). Ensure `.env` is excluded from version control.

## Installation & Setup

### Development
```powershell
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret

# Create database (MySQL CLI or GUI)
# CREATE DATABASE ucu_innovators;

# Start with auto-reload
npm run dev
```

### Production
```powershell
# Install production dependencies only
npm install --only=production

# Set environment
# NODE_ENV=production
# DB_SYNC_ALTER=false (use migrations instead)

# Start server
npm start
```

**Important**: 
- Set `DB_SYNC_ALTER=false` in production to prevent automatic schema changes.
- Use database migrations (sequelize-cli) for schema management.
- Ensure strong `JWT_SECRET` (use `openssl rand -hex 32` or equivalent).
- Configure reverse proxy (Nginx/Apache) with HTTPS termination.
- Run behind process manager (PM2, systemd) for automatic restarts.

## API Endpoints (Base: /api)
Auth (Admin-provisioned users):
- POST `/auth/register` (auth: admin only – create user accounts for students/supervisors)
- POST `/auth/login` (public – existing users authenticate)

Projects:
- GET `/projects` (public approved list + filters)
- GET `/projects/:id`
- POST `/projects` (auth: student) file field name: `document`
- PUT `/projects/:id` (auth: student owner; status resets to pending on edit)
- PATCH `/projects/:id/review` (auth: supervisor/admin)
- DELETE `/projects/:id` (auth: owner student or admin)
- POST `/projects/:id/comments` (auth)
- GET `/projects/:id/comments`

Dashboard:
- GET `/dashboard/stats` (auth; ideally admin)

Users (Admin only):
- GET `/users` (list all or filter by role, faculty_id, department_id)
- GET `/users/:id` (fetch single user)
- POST `/users` (create user) – alternative to `/auth/register`
- PUT `/users/:id` (update name, role, faculty/department, reset password)
- DELETE `/users/:id` (soft delete -> sets `active=false`)
- PATCH `/users/:id/reactivate` (restore previously deactivated user)

## Filtering (GET /projects Query Params)
- `category` (exact match)
- `technology` (substring search in `technologies` string)
- `faculty` (faculty name via association)
- `department` (department name via association)
- `year` (limits by createdAt date range)

## Uploads
Documents stored under `./uploads/` and served statically at `/uploads/...`.
Allowed types: PDF, DOC, DOCX. Max size: 10MB.

## Authentication & User Provisioning
User accounts are created by an authenticated admin (faculty administrator) via `POST /auth/register`.
There is NO public signup endpoint; the frontend should only expose a login form.

Soft deletion: Deactivated users (`active=false`) cannot log in and are excluded from listings unless `?include_inactive=true` is passed.

Include JWT in `Authorization` header for protected endpoints:
```
Authorization: Bearer <token>
```
Token payload: `{ id, role }`, expires in 1 day.

## Development Notes / Next Steps
- Add validation layer (e.g. express-validator) for stronger input hygiene
- Replace `DB_SYNC_ALTER=true` with migrations (sequelize-cli or umzug)
- Implement pagination for project listing
- Normalize technologies into a separate table for richer querying
- Add role-based route guards for admin-only analytics if expanded
- Introduce caching (Redis) for high-traffic endpoints (gallery, dashboard)
- Add tests (Jest + Supertest) and CI workflow

## Security & Production Hardening
The app now includes:
- **Helmet**: Security headers to mitigate common vulnerabilities (XSS, clickjacking, etc.)
- **Rate Limiting**: API throttling (default 100 req/15min; configurable via env)
- **Morgan Logging**: HTTP request logging (format via `LOG_FORMAT`)
- **Error Handler**: Centralized catch-all for unhandled errors

**Additional Recommendations**:
- Deploy behind HTTPS reverse proxy (Nginx + Let's Encrypt)
- Use environment-specific secrets (vault/secret manager)
- Enable CORS allowlist (replace `app.use(cors())` with origin whitelist)
- Add input validation middleware (express-validator) on all write endpoints
- Implement refresh token rotation for enhanced auth security
- Set up monitoring/alerting (Sentry, New Relic, CloudWatch)
- Configure automated backups for MySQL
- Use PM2 or systemd for process management and auto-restart

## Running Tests
Currently no test suite defined. After adding tests:
```powershell
npm test
```

## License
Internal / TBD.

---
For deeper theoretical underpinnings, read [`docs/working-theories.md`](./docs/working-theories.md).
