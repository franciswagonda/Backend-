# UCU Innovators Hub – Working Theories & Technical Concepts

## 1. Architectural Pattern (MVC / MCR in Express)
The backend follows a Model–Controller–Route variation of MVC appropriate for Express-based REST APIs.
- **Models (`/models`)**: Sequelize model definitions map JavaScript objects to MySQL tables (e.g. `User`, `Project`, `Faculty`, `Department`, `Comment`, `ProjectView`). Associations in `models/index.js` express relationships.
- **Controllers (`/controllers`)**: Contain request-handling logic (authentication, project CRUD, dashboard analytics). They orchestrate model usage and shape JSON responses.
- **Routes (`/routes`)**: Define resource-based endpoints and HTTP verb mappings, delegating to controllers and attaching middleware.
- **Views**: The "view" layer for the backend is the JSON returned to the frontend client (decoupled React app).

## 2. RESTful API Design
Core REST principles guide endpoint structure and interaction.
- **Statelessness**: Each authenticated request includes a Bearer JWT in the `Authorization` header; server holds no session state.
- **Resource-Oriented URLs**: Examples: `/api/auth/login`, `/api/projects/:id`, `/api/projects/:id/comments`, `/api/dashboard/stats`.
- **HTTP Methods**:
  - `GET /projects` – public approved project gallery with optional filtering (category, technology, faculty, department, year).
  - `GET /projects/:id` – fetch single project + view count; records a view (`ProjectView`).
  - `POST /projects` – create project (student authenticated) with optional document upload.
  - `PUT /projects/:id` – student updates project; status reverts to `pending` for moderation.
  - `PATCH /projects/:id/review` – supervisor/admin approves or rejects (`status` enum).
  - `DELETE /projects/:id` – remove project (owner student or admin).
  - `POST /projects/:id/comments` / `GET /projects/:id/comments` – discussion thread per project.
  - `POST /auth/register` / `POST /auth/login` – user lifecycle.
  - `GET /dashboard/stats` – protected analytics summary.

## 3. Relational Data Model (MySQL via Sequelize)
Normalization and referential integrity enforced through foreign keys.
- **Tables / Models**:
  - `User(id, name, email, password, role, faculty_id, department_id)`
  - `Project(id, title, description, category, technologies, github_link, document_url, status, student_id, supervisor_id)`
  - `Faculty(id, name)`
  - `Department(id, name, faculty_id)`
  - `Comment(id, content, project_id, user_id)`
  - `ProjectView(id, ip_address, viewed_at, project_id)`
- **Relationships**:
  - Faculty 1:N Departments
  - Faculty 1:N Users
  - Department 1:N Users
  - User (student) 1:N Projects (`student_id`)
  - User (supervisor) 1:N Projects (`supervisor_id`)
  - Project 1:N Comments
  - User 1:N Comments
  - Project 1:N ProjectViews
- **Integrity**: Each project ties to a valid student; supervisor optional until set. Comments enforce both `project_id` and `user_id`. Views track engagement without requiring authenticated user.

## 4. Authentication & Security
- **JWT (Stateless Auth)**: Tokens signed with `process.env.JWT_SECRET`. Payload includes `id` and `role`. Expiration set to 1 day for balance between security and usability.
- **Password Hashing**: `bcryptjs` with salt (`genSalt(10)`) prior to storing hashed password.
- **Authorization Middleware**: `authMiddleware` verifies Bearer token, attaches decoded payload to `req.user`. Controllers perform role checks (e.g. supervisor/admin for reviews).
- **Input Validation (Basic)**: Email validated at model level; further validation (e.g. password strength, project field sanitation) recommended for future hardening.
- **File Upload Security**: `multer` restricts project document uploads to `pdf|doc|docx` and a 10MB size cap.

## 5. Project Lifecycle & Moderation Workflow
1. Student submits project (status defaults to `pending`).
2. Supervisor/Admin reviews (`PATCH /projects/:id/review`) -> status updated to `approved` or `rejected`.
3. Any student edit triggers status reset to `pending` (ensures re-moderation).
4. Approved projects appear in public gallery (filterable view).

## 6. Analytics & Insights (Dashboard)
- **Counts**: Total projects, views, status distribution.
- **Faculty Aggregation**: Raw SQL joins `Projects`, `Users`, `Faculties` to count per faculty.
- **Trending Technologies**: Frequency map across comma-separated `technologies` field; top 5 retained.
- **Active Innovators**: Group by student with project counts (top 5 contributors).
- **Approval Rate**: Derived metric = `approved / total * 100`.

## 7. Component-Based Frontend Paradigm (React)
Though not in this backend repo, the design assumes a React client:
- **Reusable Components**: Cards, forms, analytics widgets consume REST endpoints.
- **State Management**: Likely via hooks or context for auth token + project data.
- **Unidirectional Flow**: Props down, events up; aligns with predictable state mutability.
- **Performance**: React Virtual DOM reconciles minimal updates; backend sends lean JSON responses.

## 8. Filtering & Query Semantics
`GET /projects` builds dynamic `where` conditions:
- Category equality match.
- Technology substring via `%LIKE%`.
- Year range -> date window on `createdAt`.
- Faculty / Department filters join through Student association (conditional `include` clauses).

## 9. Extensibility Considerations
- **Role Expansion**: ENUM in `User.role`; new roles require enum alteration and authorization logic updates.
- **Tagging/Taxonomy**: Technologies stored as comma-separated string; consider separate join table for advanced querying.
- **Caching**: High-read endpoints (gallery, dashboard) could benefit from Redis.
- **Rate Limiting**: Protect auth & write endpoints (express-rate-limit or similar).
- **Search**: Migrate substring tech search to full-text or specialized index later.

## 10. Security & Hardening Roadmap
- Enforce HTTPS and secure cookie (if refresh tokens added).
- Add validation & sanitization (e.g. `express-validator`).
- Restrict file path exposure; serve documents through controlled route.
- Implement refresh token rotation & short-lived access tokens.
- Add audit logging for reviews and deletions.

## 11. Operational Concerns
- **Environment Variables**: DB credentials + `JWT_SECRET` required; ensure `.env` excluded from VCS.
- **Migrations**: Currently implicit via `sequelize.sync()` assumption; production should use migration scripts.
- **Logging**: `logging: false` disables SQL logging; enable selectively for diagnostics.
- **Monitoring**: Future integration (Prometheus metrics, health endpoints).

## 12. Known Trade-Offs / Simplifications
- Technologies stored as flat string reduces modeling complexity but hampers relational querying.
- No pagination on project listing; may impact performance at scale.
- Faculty/Department filtering relies on name matching; IDs would be more robust.
- Basic error handling returns generic 500; consider structured error codes.

---
**Summary**: The system implements a clean, layered REST backend with clear moderation flow and foundational analytics. Future evolution centers on scaling search/filtering, tightening security, and improving relational modeling of technologies & tags.
