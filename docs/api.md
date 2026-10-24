# Masar API

Authentication is documented below. See [Stage 3](stage-3.md) for reporting/drafts, [Stage 4](stage-4.md) for agency operations, [Stage 5](stage-5.md) for announcements and [Stage 6](stage-6.md) for optional local analysis and profile contribution/settings additions.

Base URL: `http://localhost:3001`. JSON only for POST; 16 KiB maximum body. All responses use `Cache-Control: no-store`. Errors use `{ "error": { "code": "…", "message": "…" } }`. Passwords/tokens/URIs are not logged. Timestamps are UTC in MongoDB.

| Method | Path | Input | Result |
| --- | --- | --- | --- |
| GET | `/health` | None | `200 { status: "ok", demoMode: boolean }`; 503 if DB is unavailable |
| POST | `/auth/signup` | `{ displayName, email, password }` only | 201 session + user; 400 validation/privileged fields; 409 generic account-details error |
| POST | `/auth/login` | `{ email, password }` only | 200 session + user; 401 same safe message for unknown/wrong credentials |
| GET | `/auth/me` | Session | 200 `{ user, csrfToken }`; 401 expired, revoked or missing; 503 temporary service failure |
| POST | `/auth/agency` | AGENCY session, `{ agencyId }`, web CSRF | 200 `{ user, csrfToken }` with selected active agency; 403 for nonmembers/USER |
| POST | `/auth/logout` | Session, `{}` body; CSRF for web | 204 revoked; 401 invalid; 403 invalid CSRF/origin |

`user` is `{ id, displayName, email, role: "USER" | "AGENCY", agency: null | { id, name, nameAr }, agencies: [{ id, name, nameAr }] }`. USER has no memberships. The single agency demo account has two explicitly seeded memberships; other members see only their own allowed agencies. Selecting an agency changes only the current session's active agency after server authorization. Responses never include password hashes or Mongoose internals. Native login/signup responses include `{ user, csrfToken, token }`. Browser requests include `Origin`, receive `{ user, csrfToken }` and a host-only `masar_session` HttpOnly cookie. Browser requests cannot use the native token mechanism. Subsequent cookie mutations require `X-CSRF-Token`; all web origins must match `WEB_ORIGINS` exactly. Requests without Origin but with browser Fetch Metadata are rejected for mutations.

Email is trimmed/lowercased consistently on signup and login; uniqueness is a database index. Passwords are not trimmed. Signup requires name 2–80 and password 12–128 characters. Login accepts existing passwords 1–128 characters. No privileged client fields are accepted. No public agency registration exists.

Limits per IP/process: login 10/minute, signup 5/minute, general 120/minute. Returns 429 `RATE_LIMITED`. No trusted proxy by default. Errors do not identify arbitrary existing emails. Database/service failures return a generic 503 rather than exposing details. Health is public and reveals only demonstration mode and availability.

`/auth/me` is shared by both roles. Resident APIs enforce USER ownership; agency APIs enforce AGENCY membership plus case/task access. See the stage guides above for these endpoints.
Stage 8 assistant, transcription, community and Socket.IO contracts are listed in [Stage 8](stage-8.md#api-migration-and-security). Existing authentication/CSRF and case authorization apply to these endpoints.
