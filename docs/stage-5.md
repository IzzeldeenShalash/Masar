# Stage 5 — Neighborhood announcements

The Expo app and Express/MongoDB API now support draft, preview, publication, scheduling, updates, revised estimates, cancellation and resolution. Noor Electricity and Madar Roads remain fictional organizations. No real dispatch or government connection exists. All agency announcements carry this notice. Stage 6 Ollama is not implemented.

## Run

From `C:\Users\9saiq\Desktop\Masar`:

```powershell
npm.cmd run dev -- --clear
```

`--clear` creates a development session-reset marker. On the first connection to that run, the app revokes its existing session and opens the welcome screen with Get started and Sign in choices. This happens once per client per clear-start, so signing in still works afterward. Without `--clear`, `npm.cmd run dev` retains ordinary session persistence. Offline startup preserves the saved session until the reset can be completed with the server. Production builds ignore this development reset.

Do not run standalone Expo from the repository root or start two launchers. Stop the previous terminal with Ctrl+C. This stage's verification did not leave an API/Expo server running for you. Scan the newly started QR in Expo Go, with both devices on the same Wi-Fi.

Fresh demo logins remain `user@demo.com` and `agency@demo.com`, password `MasarDemo!2026`. Existing passwords are preserved. Select Agency at login for the agency workspace; choose Noor or Madar using your account's authorized memberships.

## Agency walkthrough

1. Open Alerts → Create announcement. Enter a title, type, description, street/segment, start time and optional estimated end/instructions. Dates in the editor use the device's local timezone; stored times are UTC. Confirm the displayed times in preview.
2. Choose affected service cells, using the Jordan map or place search. Search/add cells anywhere within the supported Jordan map extent. The directory also includes fictional showcase districts. Link only cases your active agency can access.
3. Save and preview the actual targeted areas and unique matching subscriber count. Saving a draft does not publish it. Confirm immediate publication, or confirm scheduling for a future start.
4. Post a public progress update, revise the estimate, edit details/areas, cancel with a reason, or resolve an active disruption with a reason. Updates are retained with timestamps and structured snapshots.
5. Open a linked report independently. Resolving or cancelling an announcement never modifies its case status. Citizens still confirm/reopen their own reports through the Stage 4 workflow.

The agency overview uses actual counts and daily activity. Queue cards open stack-based case details. The case workspace includes a Create related announcement action. Private evidence remains behind authorized retrieval.

## Targeting and privacy

Saved home and followed coordinates are mapped server-side to coarse service cells, approximately 2 km wide. These are explicitly demo service areas, not legal neighborhood boundaries. The previous coordinate-per-place subscription records are migrated to these cells without changing the resident's saved home coordinate or incident coordinates. Agencies see generic cell labels/centers, not residents' household coordinates or private place labels. Migration 008 keeps cancelled unpublished drafts private and notification-free. Migration 007 also creates the scheduler/agency/target indexes and upgrades legacy showcase announcements.

Recipients are determined from stored subscription IDs and linked report owners. Subscribers matching multiple selected cells, or also owning a linked report, receive one notification per event. Area/report preferences apply to their respective recipient paths. A person outside the selected cells cannot read an announcement unless they own a linked report. Resident announcement DTOs include only that resident's linked report IDs; other reporters' identities, private evidence and locations are excluded.

Following a new service cell immediately reveals its relevant announcements on refresh. It generates no historical notification flood. The home banner groups active announcements matching the saved home cell; the Alerts tab includes followed areas and linked reports. Live GPS does not silently change the saved home subscription.

## Scheduling and delivery

The API worker polls persisted scheduled announcements every 15 seconds and also checks on startup. Due work is activated in a transaction, with a version increment, history entry and notification upserts. Concurrent workers/retries do not duplicate work-start events. Restarting the API resumes due work from MongoDB. Keep the API running for scheduling to operate; after downtime, due items are recovered when it starts again.

An estimated end passing never resolves a disruption. Unknown ends display “Restoration time not yet provided.” Announcement resolution is a separate agency action. In-app notifications persist in MongoDB; visible views refresh/poll modestly and refresh on focus. No OS push or delivery while the app is closed is claimed.

## API

All agency paths enforce the AGENCY session and its active agency. Only the publishing agency can edit or finalize an announcement. Web mutations retain Origin/CSRF checks.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET/POST | `/agency/areas` | Paginated/searchable public service cells; add a coordinate-derived cell |
| GET | `/agency/places?q=...` | Bounded Jordan place search with map fallback |
| GET/POST | `/agency/alerts` | Filtered/paginated own list; idempotent draft creation |
| GET | `/agency/alerts/:id` | Own announcement |
| GET | `/agency/alerts/:id/preview` | Target areas and unique subscriber count |
| POST | `/agency/alerts/:id/edit` | Versioned draft/live revision with reason |
| POST | `/agency/alerts/:id/publish` | Explicit now/schedule confirmation |
| POST | `/agency/alerts/:id/update` | Public update and optional estimate/instructions revision |
| POST | `/agency/alerts/:id/cancel` | Cancel with a reason |
| POST | `/agency/alerts/:id/resolve` | Resolve an active announcement with a reason |
| GET | `/resident/alerts` | Targeted, filtered, paginated announcements |
| GET | `/resident/alerts/:id` | Explicit authorized public announcement DTO |
| GET | `/resident/reports/:id/alerts` | Own report's linked announcements |

Action requests carry the current version and a UUID action ID. Version conflicts reject stale overwrites; retrying the same action does not duplicate events. Reusing an action ID for different content is rejected. Linking is checked against the Stage 4 case-access policy, with transaction conflict protection during publication/revision.

## Navigation and interaction repairs

- Details/editors now use stack routes instead of hidden tabs, with correct role-specific back fallback.
- Closed sheets do not mount hidden content. Native/web maps unmount when unfocused; read-only previews do not intercept touches.
- Keyboard-safe forms accept button taps while editing. Home can scroll on short screens or enlarged text, avoiding clipped controls.
- Home fetches only recent cases instead of the complete history; the paginated Reports screen remains the full list. Internal history is filtered through the explicit case DTO.
- Polling is reduced outside focused views. API errors expose safe actionable messages instead of silently failing.

## Verification

Six approved integration checks passed against disposable MongoDB replica sets: the three Stage 4 workflow regressions plus three Stage 5 checks covering targeting, preference handling, deduplication, newly followed areas, private DTOs, agency ownership/version enforcement, scheduling recovery/concurrency, cancellation and independent report state. The configured online database was used only for its normal migration, not these tests.

API/mobile TypeScript, scoped ESLint and platform exports are recorded in the stage handoff. Browser button walkthrough was attempted but blocked by local browser use being disabled in Work settings. No phone touch, native permission, GPS accuracy, camera capture or OS push test is claimed. Full Arabic/RTL, accessibility and physical-device QA remain in Stage 7. Stage 6 local AI awaits instruction.
