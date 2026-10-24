# Architecture

[Stage 8](stage-8.md) adds backend Gemini/Ollama adapters, persistent read-only assistant conversations, advisory triage, consented audio transcription, support/follow records and issue-specific Socket.IO discussions. Improvements use existing incident ownership/workflow. Socket tickets derive from existing sessions; every join/send/broadcast rechecks access. Public summaries and thread DTOs retain precise-location/private-evidence restrictions. The deployment remains one API process; multi-instance fan-out is not configured.

The original authentication foundation is described below. [Stage 3](stage-3.md) adds transactional report submission, drafts and private uploads. [Stage 4](stage-4.md) adds agency operations, explicit case access, transactional transfers/tasks/resolution and foreground device location. [Stage 5](stage-5.md) adds persistent announcement scheduling and targeted notifications. [Stage 6](stage-6.md) adds backend-only local Ollama review. [Stage 7](stage-7.md) adds responsive agency layouts, presentation/accessibility polish and an optional walkthrough seed. These guides supersede the historical Stage 1 exclusions below. MongoDB must support transactions (Atlas or a replica set).

The local npm workspace executable `run` supports `npx run dev`. It reads the online MongoDB URI only for backend processes, applies migrations/seeds, starts Express, and launches Expo in LAN/Expo Go mode with a detected phone-reachable API address. The MongoDB URI is removed from the Expo child environment. Local browser API configuration stays same-site. Missing/unreachable MongoDB stops startup; there is no database fallback.

Current demo seed creates exactly `user@demo.com` (USER) and `agency@demo.com` (AGENCY) on a fresh database. The agency account has two explicit service-agency memberships. Migration `002-agency-memberships` preserves existing single-agency membership; sessions persist the selected active agency. `POST /auth/agency` checks the authenticated account's memberships before an atomic session update. This adds no third role or administrator access. Public signup still cannot supply roles or agency memberships.

One npm workspace and package-lock.json, with MongoDB, Express.js, React Native/Expo and Node.js. Expo SDK 58 runs one React Native feature tree on native and web. Expo Router guards USER and AGENCY route groups, with a startup gate before any protected screen mounts. Startup holds the native splash until locale hydration is complete; session/API checks then show a progress screen without artificial delays. Network/storage failures show recovery. An explicit 401 returns to login. Foreground checks revalidate before protected content is shown again.

TanStack Query owns the health request and is ready for future server-data queries. Auth context owns session lifecycle; automatic mutation retries are disabled. React Hook Form uses shared Zod schemas. Translations use typed English/Arabic keys, mirrored rows, explicit text direction, and a persisted locale. No global RTL restart is needed in this stage.

Express validates every input against shared strict schemas. Client role and agency fields are rejected. Explicit DTOs expose no password hash or database document internals. Every route except health, signup and login goes through authentication; `requireRole` is reusable server-side role authorization. Stage 1 has no agency-only data API; role middleware is tested using test-only routes, never registered by the live server.

MongoDB, selected by the user, replaces SQLite/Prisma. Mongoose is the maintained object mapper. Versioned migration `001-auth` creates collections, indexes and a database-level role/agency invariant; migration completion is recorded in `migrations`. DDL steps are idempotent to recover interrupted setup. Run a single migration process; concurrent deployment migration orchestration is outside this MVP. The app checks/applies migrations on startup so email uniqueness is never dependent on a background auto-index job. No multi-document transactions are needed for Stage 1. Uniqueness is enforced by MongoDB, including concurrent signup.

Collections:

| Collection | Key constraints |
| --- | --- |
| agencies | Unique fictional key, English/Arabic names |
| users | Unique normalized email; Argon2id hash; USER requires null agency; AGENCY requires agency reference |
| sessions | Unique token digest, indexed user, indexed expiry with TTL |
| migrations | Unique version, UTC application timestamp |

Only server code constructs account roles and agencies. Session tokens are random and opaque; database stores SHA-256 digests. Tokens expire after configurable hours with immediate request-time enforcement. Revocation deletes a session. Native SecureStore credentials survive restart; the web HttpOnly cookie is persistent. Each valid web session also has an unpredictable CSRF token available through `/auth/me`, retained only in client memory. Headers, bodies, cookies, tokens, password hashes and MongoDB URIs are never request-logged.

Failures never simulate success. A failed signup session creation may leave the newly created account; the client can sign in rather than resubmit the account. Logout only reports success after revocation; if local secure cleanup fails, protected content stays gated behind recovery. Public signup does not send email or offer a password reset. All organizations and seeded identities are fictional.

Excluded: neighborhood entities, navigation tabs/sidebar, reports, attachments, responsibility rules, alerts, notifications, workers, AI, maps and OS permissions. Linking/ownership/AI work begins only at its assigned stage. No Ollama dependency or port is introduced in Stage 1.
