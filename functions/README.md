# TaskSnap Backend (Node.js)

Backend is implemented with Firebase Cloud Functions (2nd gen), Express, and TypeScript.

## Structure

- `src/index.ts`: Express app entrypoint, exported as `api` function.
- `src/middleware/auth.ts`: Verifies Firebase ID token from `Authorization` header.
- `src/routes/health.ts`: Public health check.
- `src/routes/tasks.ts`: Authenticated task CRUD endpoints.
- `src/services/tasksService.ts`: Firestore data access and validation.

## Endpoints

- `GET /health`
- `GET /tasks` (auth)
- `GET /tasks/:id` (auth)
- `POST /tasks` (auth)
- `PUT /tasks/:id` (auth)
- `DELETE /tasks/:id` (auth)

## Auth Header

All `/tasks` endpoints require:

```http
Authorization: Bearer <Firebase_ID_Token>
```
