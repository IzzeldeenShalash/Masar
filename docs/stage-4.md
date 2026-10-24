# Stage 4 — Agency case ownership

Stage 4 adds saved agency operations to the existing Express/Mongoose API and Expo app. All agencies are fictional; there is no government integration or real dispatch. No stage 5 announcement publication or scheduling is included.

## Start

From `C:\Users\9saiq\Desktop\Masar`:

```powershell
npm.cmd run dev -- --clear
```

The launcher applies pending database migrations, repeats safe demo seeding, starts the API, and displays Expo's QR code. Keep phone and laptop on the same Wi-Fi. Existing `.env` configuration is preserved. Atlas or another replica set is required for transactions.

Fresh demo accounts: `user@demo.com` and `agency@demo.com`, password `MasarDemo!2026`. Seeding preserves existing passwords. The agency account switches between its authorized Noor Electricity and Madar Roads memberships. A separate browser/private session or second device allows independent citizen and agency sessions.

## Working flow

1. Resident submits a report through Details → Location → Review. It remains unassigned until an agency accepts.
2. Agency opens the new queue and accepts responsibility. Counts, search, category filters and paginated case lists come from MongoDB.
3. The lead publishes updates with optional private evidence, asks the reporter for information, and keeps agency-only notes. The citizen can respond with text/photos.
4. The lead requests a transfer with a reason. It remains accountable while pending. The recipient accepts/declines with a reason; the sender can cancel. Acceptance changes the owner atomically. Decline/cancellation preserves the owner.
5. The lead creates required or optional tasks for Noor/Madar. Only the responsible agency can update a task. Completion requires evidence. Required tasks must finish before resolution review.
6. The lead submits a resolution summary and a completion photo. Pending transfers or unanswered information requests block this action. The case becomes awaiting citizen confirmation, never automatically closed.
7. The citizen confirms or reopens with a reason. Reopening retains the accepted owner and adds history.

The tracking page and updates page show real timestamps, next action, waiting age, tasks, transfer history and authorized evidence. Notification bells open persisted, agency-scoped or resident-scoped in-app notifications, with read/all-read controls. Report preferences apply when generating citizen notifications. Polling runs modestly while views are active; there is no OS push or closed-app delivery claim.

## Location and camera

Allow foreground location once when prompted. Home centers on the current device reading, with accuracy/time shown. New reports reuse/update it instead of asking for manual selection every time. Recenter remains available. A recovered draft retains the location of that incident, and manual edits are respected. The former Explore Jordan home overlay is removed.

Foreground location watching stops in the background. GPS is not continuously uploaded. Saved home preferences change only when explicitly saved. If permission/services/GPS are unavailable, the screen explains the error and retains manual selection. A saved home or showcase location is never represented as a live GPS fix. The map covers Jordan; an outside-extent reading is explained rather than replaced with invented coordinates. Web geolocation/camera require a secure context (HTTPS or localhost).

Photo controls retain camera/library permission and recovery handling. Agency evidence uses authenticated private endpoints; attached evidence cannot be removed as an unused upload. Completion photos must be selected/captured by the agency; illustrative showcase pictures do not satisfy evidence requirements.

## Server access and atomicity

- Session determines role and active agency; client role/agency claims grant no permission.
- Both demo agencies can triage unassigned open reports. Once assigned, only the lead, an agency with a case task, or a pending receiving agency can read the agency workspace/evidence. A former lead loses access unless it retains another explicit grant.
- Agency members see only notes for their active agency. Citizen timelines exclude internal events and notes; community summaries remain separately redacted.
- Every agency case mutation uses a MongoDB transaction and serializes through the case workflow version. A partial unique index permits only one pending transfer per case.
- Client-generated action IDs make agency retries idempotent; reuse with a different payload is rejected.
- Citizen actions enforce reporter ownership and allowed states in transactions. Evidence ownership, agency scope, saved-draft references and attachment state are checked server-side.
- Migration 006 creates workflow indexes and backfills waiting/version fields. It was applied to the configured database without replacing existing records.

## API additions

Agency reads: `GET /agency/overview`, `/agency/reports`, `/agency/reports/:id`, `/agency/transfers`, `/agency/notifications`.

Agency actions under `POST /agency/reports/:id/`: `accept`, `progress`, `request-information`, `notes`, `transfers`, `transfer-response`, `tasks`, `task-update`, `resolution`. These are validated actions rather than arbitrary status patches. Public updates/reasons require at least 5 characters; task titles 3; resolution summaries 15 plus completion evidence. Agency photo upload/retrieval/removal uses `/agency/photos` with the same private lifecycle as resident photos.

Citizen actions: `POST /resident/reports/:id/action` (confirm/reopen), `/resident/reports/:id/respond`, `GET /resident/notifications`. Read markers use `POST /resident/notifications/read` or `/agency/notifications/read` with `{id}` or `{id:"all"}`. Existing session/CSRF/origin protections apply.

## Verification and limits

The user approved three focused integration checks against a disposable MongoDB replica set, leaving online records unchanged. All three passed:

1. Competing acceptance yields one owner; USER agency actions fail; private note retries do not duplicate notes; citizen DTOs omit private notes; unrelated agencies cannot read assigned cases.
2. Concurrent transfer requests allow one pending transfer; pending/declined/cancelled transfers retain the owner; accepted transfers change it; former owners cannot mutate the case.
3. Task ownership/evidence, required-task resolution gates, citizen information responses, private photo access, resolution awaiting confirmation, reopening, final confirmation and persisted notifications.

API/mobile TypeScript and scoped ESLint passed. Expo Android, iOS and web production exports passed again after the final UI refinements. This verifies bundling, not a physical device walkthrough. Actual phone GPS accuracy, OS permission prompts, camera capture, native restart, screen-reader behavior and complete RTL QA were not device-tested in this stage. Full RTL/accessibility polish remains Stage 7.

Next: Stage 5 area alert draft/preview/publication/scheduling/update/cancellation/resolution, neighborhood targeting and linked-report notifications. It requires a separate user instruction.
