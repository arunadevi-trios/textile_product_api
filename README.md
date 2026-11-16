# Textile Product API

Express API for the Textile Product admin frontend. `POST /api/auth/login` accepts `username`, `password`, and optional `rememberMe`, and returns an access JWT plus a `user` object. The refresh token is only sent as an HttpOnly cookie.

## Requirements

- Node.js 20+
- PostgreSQL 13+

## Setup

From this directory:

```sh
npm install
```

Copy `.env.example` to `.env`. Set `DATABASE_URL` to the PostgreSQL database containing the ERP `tbl_users` and `tbl_tenant` tables (and `PG_SSL=true` when the database requires TLS). Set `JWT_SECRET` to a random value of at least 32 characters, and configure `CORS_ORIGIN` for your environment.

The API looks up normalized usernames directly in `tbl_users.user_name` and verifies passwords stored in `tbl_users.password` using `scrypt`. It adds a `remember_me` column to the existing `tbl_user_session` table when connecting; the database role used by the API must be allowed to alter that table.

## Create an account

Set `NEW_USER_USERNAME` and `NEW_USER_PASSWORD` in your environment (password must be at least 12 characters), then run:

```sh
npm run create-user
```

Do not commit `.env` or expose these values in source control or logs.
New accounts use the first active tenant and are created without a role assignment.

## Run

```sh
npm run dev
```

The API listens on port 3000 by default. Configure the frontend's `VITE_API_BASE_URL` as `http://localhost:3000/api`.

## Endpoints

- `GET /api/health` — health check.
- `POST /api/auth/login` — login with JSON `{ "username": "...", "password": "...", "rememberMe": true }`. Returns `{ "accessToken": "...", "user": { "id": "...", "name": "...", "role": "..." } }` and sets the HttpOnly refresh cookie.
- `POST /api/auth/refresh` — rotates the HttpOnly refresh cookie and returns a new access token.
- `POST /api/auth/logout` — revokes the current server-side session and clears the refresh cookie.
- `GET /api/auth/me` — protected example endpoint; send `Authorization: Bearer <token>`.

Login is rate-limited to 10 attempts per IP per 15 minutes. Access JWTs expire after `JWT_EXPIRES_IN` (15 minutes by default) and are returned as `accessToken`. Refresh tokens are random, rotated on each refresh, sent only in an HttpOnly cookie, and stored as SHA-256 hashes in `tbl_user_session.session_token_hash`. The access token stays in frontend memory; it is not saved in local or session storage. The existing session table stores the server-side session token hash. “Keep me signed in” controls a 30-day persistent refresh cookie; otherwise the cookie expires with the browser and the server session expires after 12 hours. Logout revokes the server-side session and clears the cookie. In production, serve the frontend and API over HTTPS so the refresh cookie is Secure; for cross-site deployments configure `REFRESH_COOKIE_SAME_SITE=none` and `REFRESH_COOKIE_SECURE=true`.

Passwords are salted and hashed with Node's `scrypt`. Usernames are stored directly in lowercase form and compared case-insensitively. Request validation uses Joi.

## Test

```sh
npm test
```
