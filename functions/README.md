# TaskSnap Backend (Node.js)

Backend is implemented with Express and TypeScript, and it can run either:

- on Firebase Cloud Functions (2nd gen), or
- as a standalone Node server on Render, Railway, or another host

## Structure

- `src/app.ts`: shared Express app factory.
- `src/index.ts`: Firebase Functions entrypoint, exported as `api`.
- `src/server.ts`: standalone Node server entrypoint for Render/Railway.
- `src/middleware/auth.ts`: Verifies Firebase ID token from `Authorization` header.
- `src/routes/health.ts`: Public health check.
- `src/routes/auth.ts`: Public password reset OTP endpoints.
- `src/routes/tasks.ts`: Authenticated task CRUD endpoints.
- `src/services/passwordResetService.ts`: OTP generation, storage, Gmail delivery, and password update.
- `src/services/tasksService.ts`: Firestore data access and validation.

## Endpoints

- `GET /health`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
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

## OTP Email Setup

Create `functions/.env` from `functions/.env.example` and set:

- `RESET_EMAIL_USER`: the Gmail address that sends OTP emails
- `RESET_EMAIL_APP_PASSWORD`: a Gmail App Password for that sender account
- `RESET_EMAIL_FROM`: custom From header, e.g. `TaskSnap <yourgmail@gmail.com>`

## Standalone Host Setup (Render / Railway)

If you do not want Blaze, deploy this backend as a normal Node service instead of Firebase Functions.

Required environment variables:

- `RESET_EMAIL_USER`
- `RESET_EMAIL_APP_PASSWORD`
- `RESET_EMAIL_FROM`
- Firebase Admin credentials using either:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`

Build command:

```bash
npm install
npm run build
```

Start command:

```bash
npm start
```

The server listens on `PORT` automatically.

After deploy, set your app's root `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-host.example.com
```

Then restart Expo so the app sends OTP requests to your hosted backend.
