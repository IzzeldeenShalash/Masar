# MASAR | مسار — Complete Project Overview

**One report. A clear path to resolution.**  
**بلاغك واضح، ومساره معروف.**

Prepared from the repository documentation and implementation on **24 October 2026**.

## 1. What Masar Is

Masar is a bilingual civic reporting and service coordination prototype focused on Jordan. It gives residents a way to report problems in public spaces, attach evidence, identify the incident location, and follow the report through a visible process. It gives service agencies a workspace for accepting responsibility, coordinating work, communicating with residents, and submitting evidence of a solution.

The project combines a resident application, an agency workspace, a backend API, a MongoDB database, private photo storage, area announcements, and optional local AI assistance.

Masar is implemented as a hackathon demonstration. Its service organizations, Noor Electricity and Madar Roads, are fictional. Reports and preferences are real persisted application records, but submitting a report does not contact a government department or dispatch a real team.

## 2. The Problem and Product Idea

The product addresses a common reporting problem: a person can describe an issue, but may not know who should handle it, whether anyone accepted it, what is happening next, or whether a proposed fix actually resolved the issue.

Masar organizes those questions into an explicit process:

1. What happened?
2. Where did it happen?
3. What evidence is available?
4. Which agency accepted responsibility?
5. Is another agency involved?
6. What work has been recorded?
7. What information is still needed from the resident?
8. Has a solution been submitted?
9. Does the resident confirm that the issue is resolved?

The central idea is accountability. A report has an identifiable state, a timeline, an accepted owner when an agency takes responsibility, and a next action. A transfer request does not remove the current owner's responsibility while the request is pending. A submitted resolution waits for resident confirmation.

## 3. Users and Roles

There are two application roles: `USER` and `AGENCY`.

| Role | Main capabilities |
| --- | --- |
| Resident (`USER`) | Register, manage a profile, save places, create reports, attach photos, follow progress, answer questions, confirm or reopen reports, and read relevant announcements. |
| Agency member (`AGENCY`) | Use an authorized agency workspace, review accessible cases, accept responsibility, publish progress, coordinate transfers and tasks, submit resolutions, and manage announcements. |

There is no administrator role in the current shared role contract. Public registration creates residents only. Agency membership is assigned on the server; choosing an agency in the interface cannot create membership or grant permission.

An agency account may have multiple memberships. Selecting an active agency changes the current session's workspace after the backend verifies membership.

## 4. Resident Experience and Screens

The resident experience includes:

- A welcome screen and animated brand entrance.
- Sign in and resident registration.
- Connection/session recovery screens.
- First-login setup for a saved home and followed places.
- A home dashboard.
- A Jordan map.
- A paginated personal report list with search and filters.
- A three-step new report flow.
- Report details, tracking, and timeline updates.
- Responses to agency information requests.
- Resolution confirmation and reopening.
- A community feed of separately shared summaries.
- Area announcements and announcement details.
- An in-app notification center.
- A profile with contribution counts, preferences, places, help, and sign out.

Expo Router files define navigation, while most screen implementation lives in feature folders under `apps/mobile/src/features`.

### Home

The home screen brings together recent reports, relevant announcements, location context, and reporting actions. The backend home snapshot fetches up to eight recent personal reports; the separate Reports screen is the paginated source for the full history. Contribution totals are calculated across all of the resident's reports rather than only those recent eight.

Home-related announcements use the saved home service area. Moving with live GPS does not silently change the saved home or its subscriptions.

### Profile

The resident profile includes display name, sign-in email, optional private phone number, biography, avatar color preference, saved home, followed places, and notification preferences. Email remains the sign-in identity; the current profile editor does not provide an email-change workflow. Phone numbers are unverified.

The contribution section shows total reports, reports currently `in_progress`, and reports `closed` as resolved. These counts can include clearly labeled showcase records associated with the account.

Help includes reporting guidance, connection checks, permission guidance, and navigation to reports. It is not a live support desk.

## 5. Creating a Report

The reporting interface has three steps: **Details → Location → Review**.

### Details

A resident enters a title and description, chooses a category, and optionally attaches photos. Categories are:

| Stored value | Meaning |
| --- | --- |
| `lighting` | Lighting issues. |
| `roads` | Road-related issues. |
| `waste` | Waste-related issues. |
| `water` | Water-related issues. |
| `other` | Another issue. |
| `unsure` | The resident is unsure of the category. |

The shared submission schema requires a title of 5–100 characters and a description of 15–2,000 characters. A landmark or directions can contain up to 160 characters. A report supports up to three photo IDs.

Supporting a category does not mean a specialized agency exists for it in the demonstration. Agency acceptance and coordination remain explicit actions.

### Location

The resident can use foreground GPS, search for a place, select a map point, or enter a descriptive location without coordinates. A location label is required. Coordinates must be provided as a pair when used.

The configured map extent is latitude 29–33.5 and longitude 34.8–39.4. This is a rectangular supported extent, not a precise national-border polygon or official service jurisdiction.

Saved drafts retain their incident location. Automatic GPS selection respects recovered drafts and manual location changes.

### Review

The resident reviews the description, category, incident location, and evidence. They can optionally request AI text review and optionally write a separate community summary. They can submit manually without AI.

Successful submission returns a case identifier and case number. The report is initially unassigned and awaits manual agency acceptance.

## 6. Drafts, Retries, and Submission Integrity

Drafts are saved in MongoDB against the resident account. The data model supports one saved report draft per user. A draft has a version so one device cannot silently overwrite a newer saved version from another device.

The interface can restore, save, reload, or discard a draft. Draft saving is explicit, including attempts when moving between reporting steps; it is not a guarantee of continuous offline autosaving.

Each report submission carries a UUID `submissionId`. The backend stores a digest of the submitted content and has a unique user/submission index. Retrying matching content returns the existing report. Reusing the same submission identifier with different content is rejected.

Report creation uses a MongoDB transaction to coordinate the report, photo attachment claims, matching AI analysis attachment when available, the submission notification, and deletion of the corresponding saved draft. MongoDB must therefore support transactions through a replica set or compatible sharded deployment.

## 7. Report States and Resolution

| State | Meaning |
| --- | --- |
| `submitted` | Saved and awaiting agency handling. |
| `under_review` | In the agency review process, including after acceptance. |
| `in_progress` | Work/progress has been recorded. |
| `awaiting_citizen_confirmation` | A resolution has been submitted for resident review. |
| `closed` | The resident confirmed resolution. |
| `reopened` | The resident reopened the case. |

A typical path is:

```text
Resident submits
    → Agency accepts responsibility
    → Agency records progress and coordinates work
    → Agency submits resolution and completion evidence
    → Resident confirms
    → Case closes
```

A resident may reopen a report from a closed or awaiting-confirmation state with a reason. Reopening retains the accepted agency owner and records a timeline event.

The case DTO also describes the next action, such as agency review, lead update, transfer decision, citizen response, citizen confirmation, or none. Tracking uses actual timestamps and a waiting-since value.

## 8. Agency Workspace

The agency side includes an overview, report queue, case workspace, incoming/outgoing transfers, notifications, announcements, and profile/settings. Wider layouts include an agency sidebar.

The overview includes counts for unassigned reports, active owned reports, cases awaiting resident confirmation, closed cases, incoming pending transfers, and unfinished tasks. It also includes recent accessible cases and seven days of case creation activity within the access filter.

The queue supports pagination, search, category filtering, and views such as unassigned, owned, active, awaiting confirmation, closed, incoming transfers, and tasks.

In a case workspace, an authorized agency can view report details and evidence, inspect the owner and timeline, and perform permitted actions. Those actions are validated backend operations, not arbitrary client-supplied status changes.

## 9. Agency Case Access

An agency can read a case when at least one applicable access condition holds:

- It is the accepted lead agency.
- The case is unassigned in an eligible open state.
- The agency has a task on the case.
- The agency is the recipient of a pending transfer.

A former lead can lose access after a transfer unless another grant remains, such as a task. A task provides case access even when that task is completed under the current access query.

Read access does not imply permission to perform every action. Lead-only operations, task updates, transfer responses, and resident actions have separate server checks.

## 10. Progress, Information Requests, and Private Notes

The lead agency can record progress with optional evidence. This moves the case to `in_progress` and creates a resident-visible timeline event.

The lead can ask the resident for more information. The resident responds with text and optional photos through their own authenticated report. A pending information request blocks resolution submission.

Agencies can add internal notes. Notes are scoped to the active agency. Resident timelines exclude internal history, and agency notes are returned separately for that active agency.

User-written text remains user-written text. The existence of Arabic interface support does not mean arbitrary descriptions or agency updates are automatically translated.

## 11. Transfers and Shared Tasks

### Transfers

A lead agency can request a transfer to another supported demonstration agency with a reason. The recipient can accept or decline, and the sender can cancel a pending request.

The original agency remains accountable until acceptance. Decline or cancellation preserves ownership. Acceptance changes ownership atomically.

A partial unique database index permits only one pending transfer per case. Transactional changes and action IDs protect against competing updates and repeated agency requests.

### Tasks

The lead can create required or optional tasks assigned to supported agencies. Task states are `pending`, `in_progress`, and `completed`.

Only the assigned agency can update its task. Completing a task requires evidence, either newly attached or already recorded on that task. All required tasks must be complete before the lead can submit a resolution.

### Resolution gates

Resolution requires a summary of at least 15 characters and at least one completion photo. It is blocked while a transfer is pending, required tasks remain incomplete, or requested citizen information is outstanding. Submission puts the case into `awaiting_citizen_confirmation`.

## 12. Community Sharing and Privacy

Reports are private by default. A resident may opt into a separate community summary.

The community API exposes the report ID, title, separate public summary, category, status, creation time, and demo label. It does not expose the report's private description, photos, reporter identity, or precise incident location.

The public summary must contain at least 15 characters and can contain up to 240. Residents can disable community visibility later. Public titles and summaries are still written by people, so the interface advises against putting personal information in them.

## 13. Area Announcements

Announcements describe service disruptions or scheduled work affecting areas and optionally linked cases. They have their own lifecycle, independent of an individual report.

Types include electricity outages, electricity maintenance, road closures, roadworks, water interruptions, and general disruptions.

An agency can create a draft, select affected service areas, link accessible cases, preview the subscriber count, publish immediately, schedule a future start, revise details, post updates, revise estimated times/instructions, cancel, or resolve an active disruption.

| Announcement state | Meaning |
| --- | --- |
| `draft` | Saved but unpublished. |
| `scheduled` | Published for a future start. |
| `active` | Active disruption or work. |
| `resolved` | Explicitly resolved by the publishing agency. |
| `cancelled` | Explicitly cancelled. Unpublished cancelled drafts remain private. |

Only the publishing agency can edit or finalize its announcement. Mutations use versions and action UUIDs to reject stale changes and deduplicate matching retries.

Resolving an announcement does not close linked reports. Passing an estimated end time does not automatically resolve the announcement.

## 14. Service Areas and Audience Targeting

The backend maps saved home and followed coordinates into coarse demonstration service cells using a 0.02-degree grid. Their physical dimensions vary; documentation describes them as approximately two kilometres wide. They are not official administrative boundaries.

The directory also includes fictional showcase districts in Amman, Irbid, Aqaba, and Zarqa.

Residents can save up to ten followed coordinate locations and optionally follow the predefined showcase feeds. Coordinates and personal place labels can be stored privately while the agency directory exposes generic cell labels and centers.

Announcement access is based on saved area subscriptions or ownership of a linked report. Resident responses filter linked case IDs so residents do not receive other reporters' linked case identifiers.

Notification recipients are deduplicated across overlapping areas and linked report ownership. Area and report notification preferences apply to their respective recipient paths. Following an area makes relevant announcements accessible on refresh without generating a flood of historical notifications.

## 15. Scheduling and Notifications

The API starts a scheduling worker that checks due published announcements at startup and every 15 seconds. It activates due scheduled announcements using transactions, version changes, timeline events, and notification upserts.

Persisted scheduling lets the worker recover due work after an API restart. The API must be running for timely processing.

Notifications are stored in MongoDB and include read state and report/announcement links. There are resident and agency notification views with individual and all-read controls. Some focused views refresh periodically, and screens also refresh on focus.

This is an in-app notification system. OS push, SMS, email delivery, and reliable closed-app delivery are not implemented.

## 16. Photos and Evidence

Residents and agencies can capture or select photos with permission and recovery handling in the app. The backend accepts JPEG or PNG input, with a maximum input size of 2 MB and a 24-megapixel processing limit. Animated/multipage input is rejected.

Sharp processes accepted images, applies orientation, resizes within 1,600 × 1,600 pixels without enlargement, and writes JPEG output. Re-encoding strips source metadata such as EXIF.

Photo records live in MongoDB; processed image bytes live in the backend upload directory. Files use generated names. There is no public static uploads directory.

Photo retrieval checks authentication and ownership or case access. Agency uploads are scoped to the active agency. Attached case evidence cannot be removed through the unused-upload deletion flow.

Photo states are `unattached`, `attached`, and `deleting`. Unattached uploads initially have a seven-day expiry, and saving a draft refreshes the referenced upload expiry. Cleanup handles unused photos. Upload UUIDs support idempotent retries, and the backend currently limits photo records per account to 300.

Photos do not undergo AI image understanding. Metadata removal also does not redact faces, plates, or visible personal details; the interface asks users to avoid them.

## 17. Maps, GPS, and Place Search

The map uses Leaflet with OpenStreetMap tiles. Native rendering uses a WebView, and web has a dedicated map component. Leaflet assets are referenced from a CDN, so map display depends on those external assets and tile availability.

Map messages are checked for supported coordinates and known report identifiers before callbacks are accepted. Map payload serialization escapes `<` characters.

Foreground GPS is provided through Expo Location. The controller handles permissions, disabled services, request timeout, stale readings, accuracy display, and out-of-extent locations. It can reuse a recent fix and watch updates while authenticated and active; watching stops in the background.

GPS does not continuously upload movement or silently change the saved home. Permission denial retains manual location options. Browser geolocation and camera use require an appropriate secure context such as HTTPS or localhost.

Place search goes through the backend to Photon. It bounds the query, filters returned results to Jordan and the supported extent, caches results, rate limits searches, and applies an upstream timeout. A search failure leaves manual map selection available.

## 18. Optional Local AI Review

Masar integrates backend-only Ollama text review. Repository documentation records local use of `qwen3:4b-instruct`; the actual configured model is selected through backend environment variables.

The resident explicitly requests analysis during review. The model can suggest a category, summarize reported facts, ask for missing information, suggest agencies using supplied fictional responsibility rules, and identify possible duplicates from a bounded candidate list.

AI results are advisory. AI cannot dispatch, accept ownership, transfer cases, merge reports, publish announcements, change restoration estimates, close cases, or silently rewrite the original report. Manual submission remains available during provider failure or without analysis.

### Model input and validation

The model receives report text, a location label and landmark, fictional responsibility references, and bounded duplicate references. Photos, credentials, session tokens, and database write tools are not provided. Exact incident coordinates are used by backend candidate filtering rather than supplied as explicit model coordinate fields; users can still type sensitive information into free text or labels.

The Ollama call uses nonstreaming structured JSON output. Zod validates the output structure and the backend checks supplied agency, rule, and candidate references. Unknown or inapplicable references are rejected. One repair retry is permitted within a shared inference deadline.

Only one inference runs at a time per analysis service instance. The backend also applies a separate analysis rate limit. Provider states distinguish disabled, missing configuration, missing model, unavailable provider, and ready/demo operation.

### Duplicate candidates

Candidates must be the reporter's own reports or explicitly shared reports. Filtering uses a 14-day window, a nonclosed state, the selected category unless unsure, and a distance bound of 2.5 km when coordinates exist. Without coordinates, the location label must match.

The initial read is capped at 40 records; at most five candidates reach the model. Private candidate descriptions and evidence are not sent, including for the reporter's own private cases. Duplicate suggestions do not automatically merge records or block another submission.

### Persistence and fallback

Analysis records store provider, model, schema version, input digest, references, attempts, duration, and outcome. Matching successful analyses can be reused. A successful analysis is attached to a report only when it matches the submission facts and ownership checks.

Raw prompts and invalid raw model output are not stored as analysis logs. Own-analysis retrieval rechecks candidate visibility. The common case DTO suppresses duplicate references rather than exposing unrelated cases to agencies.

Supported modes are `ollama`, `disabled`, and a clearly labeled deterministic `fixture` for nonproduction demo use. Fixture mode is not an automatic fallback for Ollama failure.

## 19. Technical Stack

Versions below describe the checked-in package declarations, not a recommendation about the newest available releases.

| Layer | Technology |
| --- | --- |
| Main language | TypeScript. |
| Workspace | npm workspaces and a shared lockfile. |
| App | React 19.3, React Native 0.88, Expo SDK 58. |
| Web | React Native Web and React DOM. |
| Routing | Expo Router. |
| Server data | TanStack Query. |
| Forms and validation | React Hook Form, Zod, resolver integration. |
| Native capabilities | Expo Location, SecureStore, Image Picker, Image Manipulator, Crypto, and Splash Screen. |
| Backend | Node.js and Express 5. |
| Database | MongoDB and Mongoose 9. |
| Password hashing | Argon2id through `@node-rs/argon2`. |
| Image processing | Sharp. |
| Maps/search | Leaflet, OpenStreetMap tiles, and Photon. |
| Optional AI | Ollama local text inference. |
| Verification | TypeScript, ESLint, Node test runner, Supertest, and temporary MongoDB replica sets. |

## 20. Architecture and Repository Layout

```text
Masar/
├── apps/
│   ├── mobile/
│   │   ├── app/                 Expo Router routes and role layouts
│   │   ├── src/
│   │   │   ├── auth/            Session lifecycle
│   │   │   ├── api/             HTTP client and errors
│   │   │   ├── components/      Shared controls and visual tokens
│   │   │   ├── accessibility/   Accessibility helpers
│   │   │   ├── i18n/            Locale, strings, and formatting
│   │   │   └── features/        Auth, resident, agency, and alerts
│   │   ├── assets/              Brand and illustrative artwork
│   │   └── test/               Interface utility/polish tests
│   └── api/
│       ├── src/                 API, models, workflows, workers, seeds
│       │   └── migrations/     Versioned database migrations
│       └── test/               HTTP integration and stage tests
├── packages/
│   ├── shared/                 Shared schemas, contracts, demo constants
│   └── dev-cli/                Local development launcher and tests
├── docs/                       Architecture, stages, verification, screenshots
├── output/                     Existing generated/mockup artifacts
├── README.md
└── PROJECT_OVERVIEW.md
```

```text
Resident / agency application
          │ HTTP API requests
          ▼
Express API
    ├── MongoDB: accounts, sessions, reports, workflows, announcements
    ├── Private upload directory: processed image files
    ├── Photon: optional place search requests
    └── Ollama: optional local text inference

Map renderer → Leaflet assets and OpenStreetMap tiles
```

The phone connects to the API, not directly to MongoDB or Ollama. The backend owns authorization and state transitions. Shared contracts keep frontend forms and backend validation aligned. TanStack Query manages server data; authentication and locale providers manage their respective lifecycle state.

## 21. Data Model

| Entity/model | Responsibility |
| --- | --- |
| `Agency` | Fictional agency key and English/Arabic names. |
| `User` | Identity, password hash, role, and agency memberships. |
| `Session` | Token digest, CSRF token, active agency, and expiry. |
| Migration records | Applied database schema/index versions. |
| `Resident` | Profile data; also reused for agency profile fields. |
| `Incident` | Report content, status, owner, evidence references, timeline, and resolution. |
| `ReportDraft` | Versioned account-level report draft. |
| `Photo` | File metadata, ownership, attachment state, and expiry. |
| `Neighborhood` | Coarse service cell or fictional showcase area. |
| `UserNeighborhoodSubscription` | Home/followed area subscriptions and private saved point details. |
| `NotificationPreference` | Report and area notification choices. |
| `ResidentNotification` | Persisted resident/agency in-app notifications. |
| `TransferRequest` | Accountable transfer lifecycle. |
| `AgencyTask` | Assigned shared work and completion evidence. |
| `InternalNote` | Private agency notes on cases. |
| `AreaAlert` | Announcement content, targets, publication state, schedule, and history. |
| `ResponsibilityRule` | Fictional AI reference rules. |
| `AIAnalysis` | Validated review outcomes and analysis metadata. |

Indexes enforce constraints such as normalized unique email, token digest uniqueness, user/submission uniqueness, one draft per user, user/upload uniqueness, subscription uniqueness, notification event deduplication, and one pending transfer per case.

Versioned migrations `001` through `009` cover authentication, memberships, resident data, neighborhoods/photos, reporting, agency workflow, area alerts, publication visibility, and local AI. Startup applies pending migrations. Concurrent deployment migration orchestration is outside the documented MVP workflow.

## 22. API Surface

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Database availability and demo mode. |
| POST | `/auth/signup` | Resident registration. |
| POST | `/auth/login` | Authentication. |
| GET | `/auth/me` | Current account and CSRF data. |
| POST | `/auth/agency` | Authorized active-agency selection. |
| POST | `/auth/logout` | Session revocation. |

### Resident

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/resident` | Profile, contribution counts, recent reports, alerts, notifications. |
| POST | `/resident/profile` | Save profile and places. |
| POST | `/resident/preferences` | Save notification preferences. |
| GET | `/resident/places` | Place search. |
| GET/POST | `/resident/reports` | Paginated list / submit report. |
| GET | `/resident/reports/:id` | Own report detail. |
| POST | `/resident/reports/:id/visibility` | Community visibility and summary. |
| POST | `/resident/reports/:id/action` | Confirm or reopen. |
| POST | `/resident/reports/:id/respond` | Respond to information request. |
| GET/POST | `/resident/draft` | Retrieve/save versioned draft. |
| POST | `/resident/draft/discard` | Discard matching draft version. |
| GET | `/resident/public-reports` | Redacted community summaries. |
| POST | `/resident/photos` | Upload private photo. |
| GET | `/resident/photos/:id` | Authorized image retrieval. |
| POST | `/resident/photos/:id/remove` | Remove eligible unused upload. |
| GET | `/resident/notifications` | Resident notification list. |
| POST | `/resident/notifications/read` | Read markers. |
| GET | `/resident/alerts` | Accessible announcements. |
| GET | `/resident/alerts/:id` | Accessible announcement detail. |
| GET | `/resident/reports/:id/alerts` | Own case's published announcements. |
| GET | `/resident/ai/status` | AI provider status. |
| POST | `/resident/ai/analyze` | Explicit report text analysis. |
| GET | `/resident/ai/analyses/:id` | Own successful analysis. |

### Agency

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/agency/overview` | Counts, recent cases, weekly activity. |
| GET | `/agency/reports` | Accessible case queue. |
| GET | `/agency/reports/:id` | Authorized workspace and private notes. |
| POST | `/agency/reports/:id/accept` | Accept responsibility. |
| POST | `/agency/reports/:id/progress` | Record public progress. |
| POST | `/agency/reports/:id/request-information` | Ask resident a question. |
| POST | `/agency/reports/:id/notes` | Add agency-private note. |
| POST | `/agency/reports/:id/transfers` | Request transfer. |
| POST | `/agency/reports/:id/transfer-response` | Accept, decline, or cancel transfer. |
| POST | `/agency/reports/:id/tasks` | Add task. |
| POST | `/agency/reports/:id/task-update` | Update assigned task. |
| POST | `/agency/reports/:id/resolution` | Submit evidence-backed resolution. |
| GET | `/agency/transfers` | Transfer history. |
| GET/POST | `/agency/profile` | Read/save account profile fields. |
| GET | `/agency/places` | Place search. |
| POST/GET | `/agency/photos`, `/agency/photos/:id` | Private evidence upload/retrieval. |
| POST | `/agency/photos/:id/remove` | Remove eligible unused evidence. |
| GET | `/agency/notifications` | Active-agency notification list. |
| POST | `/agency/notifications/read` | Agency read markers. |
| GET/POST | `/agency/areas` | Search/create demonstration service cells. |
| GET/POST | `/agency/alerts` | Own announcement list / draft creation. |
| GET | `/agency/alerts/:id` | Own announcement detail. |
| GET | `/agency/alerts/:id/preview` | Preview audience and content. |
| POST | `/agency/alerts/:id/edit` | Versioned revision. |
| POST | `/agency/alerts/:id/publish` | Publish now or schedule. |
| POST | `/agency/alerts/:id/update` | Public update and estimate/instructions changes. |
| POST | `/agency/alerts/:id/cancel` | Cancel announcement. |
| POST | `/agency/alerts/:id/resolve` | Resolve active announcement. |

## 23. Authentication and Security

Passwords are hashed with Argon2id. Session tokens are random opaque values, with SHA-256 token digests stored in MongoDB. Expiry is enforced during requests as well as through a TTL index.

Native sessions use Expo SecureStore and bearer authorization. Browser sessions use an HttpOnly, SameSite=Strict cookie, exact origin checks, and an in-memory CSRF token for authenticated mutations. Browser requests with an Origin use the cookie mechanism rather than a supplied native bearer token.

The backend rejects client-supplied privileged registration fields. It constructs the account role and memberships itself. Role middleware and case-level checks protect resident and agency APIs.

Requests use strict shared schemas where defined. Normal JSON parsing is limited to 16 KiB, with a separate 3 MB parser allowance for photo paths. Rate limits include general requests, login, signup, place search, and AI review. Limits are per process/IP; trusted proxy configuration is disabled by default.

Responses use no-store caching headers and additional basic security headers. Private image responses are also no-store. The application avoids request logging of bodies, cookies, tokens, password hashes, or database URIs. This is an implementation overview, not a security audit or production-readiness certification.

The client distinguishes expired sessions from temporary connectivity failures. Temporary failure can retain saved credentials, while explicit unauthorized responses clear the session. Logout revokes the server session. Protected route groups separate residents and agencies.

## 24. Language, Design, and Accessibility

Masar supports English and Arabic with a persisted locale, translated interface text, mirrored layouts, explicit text direction, and localized formatting. Formatting helpers isolate left-to-right identifiers such as emails, coordinates, and case numbers inside Arabic text.

The visual language includes teal, ink, amber and neutral colors, rounded cards, reusable controls, original neighborhood artwork, and a skyline profile header. The app includes reduced-motion handling, focus styles, accessibility labels/roles, keyboard-aware forms, safe areas, and contrast utility tests.

The presence of those helpers and tests does not establish full accessibility compliance. Native screen-reader behavior, enlarged-text layouts, all Arabic/RTL combinations, and physical-device interactions still require broader walkthroughs.

## 25. Running the Project

The root declares supported Node versions as `>=22.23.4 <23 || >=24.15.0 <25`. Use the repository's npm workspace workflow.

```powershell
npm install
npm run dev
```

The repository also supplies the local executable:

```powershell
npx run dev
```

Run it after installing dependencies. Standalone Expo commands belong in `apps/mobile`; starting Expo from the repository root can select the wrong project.

The launcher checks configuration and ports, prepares missing app environment files without overwriting existing ones, connects to the configured MongoDB, applies migrations, seeds demo identities when enabled, starts the API, detects a phone-reachable LAN address, and starts Expo Go in LAN mode.

It removes the MongoDB URI from the Expo child environment. Missing/unreachable MongoDB stops startup instead of silently using another database.

The phone and laptop should share a reachable network. The API binds to `0.0.0.0:3001` by default. A physical phone uses the laptop's LAN address; phone localhost points to the phone. Browser development normally uses a separate localhost API URL for same-site cookies.

To clear Metro and activate the development session reset behavior:

```powershell
npm run dev -- --clear
```

This also returns each connected development client to welcome once for that run by revoking its prior session. Starting without `--clear` preserves normal sessions.

Repository documentation records a Windows-specific Node runtime workaround: the launcher uses a checksum-verified local Node runtime and applies `--jitless` to backend setup/API processes after native V8 crashes on this machine. The workaround is not applied to Expo/Metro because its parser needs WebAssembly.

## 26. Configuration

Backend configuration is read from environment variables, normally through the ignored `apps/api/.env`. Do not copy real connection credentials into documentation or frontend public variables.

| Variable | Purpose / current code default |
| --- | --- |
| `MONGODB_URI` | Required MongoDB connection URI. |
| `API_HOST` | Bind address; `0.0.0.0`. |
| `API_PORT` | API port; `3001`. |
| `DEMO_MODE` | Demo behavior; `true` by default. |
| `COOKIE_SECURE` | Secure cookies; `false` for local HTTP. |
| `WEB_ORIGINS` | Exact comma-separated allowed web origins. |
| `SESSION_TTL_HOURS` | Session lifetime; `168`. |
| `NODE_ENV` | Development, test, or production. |
| `PHOTON_BASE_URL` | Place search provider; `https://photon.komoot.io`. |
| `UPLOAD_DIR` | Private image directory; `uploads`. |
| `AI_MODE` | `ollama`, `disabled`, or permitted demo `fixture`. |
| `OLLAMA_BASE_URL` | Backend Ollama URL; `http://127.0.0.1:11434`. |
| `OLLAMA_MODEL` | Installed model tag; blank until configured. |
| `AI_TIMEOUT_MS` | Inference deadline; `45000`, configurable within validated bounds. |

Frontend API configuration uses `EXPO_PUBLIC_API_URL` and, for browser use, `EXPO_PUBLIC_WEB_API_URL`. The launcher supplies these for its normal startup workflow.

An example local AI configuration documented by the project is:

```dotenv
AI_MODE=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b-instruct
AI_TIMEOUT_MS=90000
```

The model must already be installed in Ollama. Masar checks availability and installed tags; it does not silently download models or switch to cloud inference.

## 27. Demo Accounts and Showcase Data

Fresh demo seeding creates these two login identities:

| Role | Email | Demo password |
| --- | --- | --- |
| Resident | `user@demo.com` | `MasarDemo!2026` |
| Agency | `agency@demo.com` | `MasarDemo!2026` |

The agency account has memberships in fictional Noor Electricity and Madar Roads. Existing passwords are preserved by repeatable seeding. Older accounts and agency records are not automatically deleted.

Demo addresses are application login identifiers, not provided email inboxes. Public registration supports other resident emails but does not verify inbox ownership.

Walkthrough seeding supplies additive showcase cases and linked workflow records. Its tests check repeatability and preservation of changed case/announcement states. Root command `npm run demo:scenarios` exposes the demonstration workflow through the development CLI.

Showcase records and illustrative images must be distinguished from actual captured evidence or new resident submissions.

## 28. Development Commands and Tests

```powershell
npm run dev
npm run api
npm run mobile
npm run web
npm run db:migrate
npm run db:seed
npm run typecheck
npm run lint
npm test
npm run test:polish
npm run expo:check
npm run export:web
npm run export:android
npm run test:preview
npm run demo:scenarios
```

The root test command runs API tests, mobile polish tests, and launcher tests. API tests use Supertest and isolated temporary MongoDB infrastructure, including replica sets for transactional workflows. They do not use the configured online database as a test fallback.

Existing test suites cover authentication, memberships, CSRF/origins, drafts, idempotency, private photos, agency ownership races, transfers, tasks, resolution, targeting, scheduling, AI validation/timeouts, walkthrough seeds, locale formatting, contrast, and launcher configuration.

The mobile polish suite checks malformed locale fallback, Arabic isolation of identifiers, transfer labels, timestamp formatting, service-area presentation, and selected palette contrast ratios.

Repository verification documents record previously passed type checks, scoped lint, platform exports, integration tests, and real local Ollama inference. Those records describe prior runs. This overview was prepared through inspection; no new test run or physical-device walkthrough was performed while writing it.

## 29. Implementation Stages and Documentation Status

The documentation describes staged development:

1. Authentication, sessions, roles, database foundation, and launcher.
2. Resident setup, places, GPS, profile, permissions, and private photos.
3. Versioned drafts, transactional submission, report history, and community summaries.
4. Agency ownership, transfers, tasks, evidence, information requests, and resident confirmation.
5. Announcement drafts, targeting, publication, scheduling, updates, and resolution.
6. Local AI text review and profile/contribution improvements.
7. Polish, walkthrough data, accessibility/RTL work, and device QA.

The repository contains Stage 7 test code and polish utilities, although the README and Stage 6 guide still describe broader Stage 7/device QA as remaining. Older documents also contain superseded statements about database setup and unavailable features. Current code and the latest relevant stage guide should be checked together; historical exclusions should not be treated as the present feature list.

## 30. Current Limitations and Deployment Considerations

Current boundaries include:

- Fictional agencies and no real government integration or dispatch.
- No public agency onboarding or administrator workspace.
- No email ownership verification, password reset flow, or email delivery.
- No OS push, SMS, or closed-app delivery guarantee.
- No AI photo understanding or voice transcription.
- No autonomous AI assignment, merging, or case closure.
- No official neighborhood/service-boundary dataset.
- No guarantee of offline maps, offline submission, or offline draft synchronization.
- Dependence on map assets/tiles and Photon for their respective online functions.
- Backend filesystem storage for evidence, requiring operational persistence and backups if deployed.
- Per-process workers, rate limits, and inference concurrency controls rather than a complete distributed operations platform.
- Remaining native permission, GPS accuracy, camera, screen-reader, enlarged-text, and full RTL/device walkthrough work.

Deployment would require HTTPS, secure cookies, exact HTTPS origins, appropriate same-site web/API hosting, dedicated database access, intentional demo configuration, persistent private storage, backups, monitoring, and an operational review. Production configuration checks enforce some prerequisites but do not by themselves make the prototype production ready.

## 31. Licensing

Original project code is covered by the repository's MIT license. Third-party dependencies, map attribution, artwork notes, and model references are documented in `THIRD_PARTY_NOTICES.md` and related guides. Model weights are stored by Ollama rather than distributed as repository code, and model licenses must be considered separately from the application license.

## 32. Example End-to-End Demonstration

1. A resident signs in and saves a home or followed place.
2. They report a broken streetlight, add a description and optional photo, and confirm the incident location.
3. They optionally request local AI review and inspect the advisory category, summary, missing information, and fictional rule references.
4. They submit and receive a persisted case number. The report awaits agency acceptance.
5. An authorized Noor member accepts responsibility and posts progress.
6. If road work is needed, the lead creates a required task for Madar. Madar records work and completion evidence.
7. The lead may publish a related area announcement, selecting affected service cells and linking the accessible report.
8. Relevant residents receive deduplicated in-app notifications according to preferences.
9. The lead submits a resolution summary and completion photo after outstanding gates are satisfied.
10. The original resident confirms the solution, closing the case, or reopens it with a reason.

This scenario illustrates the implemented coordination model. It describes actions inside the fictional demonstration, without implying that real utilities or public authorities receive the report.

## 33. Short Project Description to Reuse

Masar is a bilingual civic reporting and agency coordination prototype for Jordan. Residents can report public-space issues, add private photos, select locations, save drafts, and follow a clear case timeline. Fictional service agencies can accept responsibility, coordinate transfers and shared tasks, publish area announcements, and submit evidence-backed resolutions for resident confirmation. The system uses React Native and Expo, an Express API, MongoDB with Mongoose, shared TypeScript/Zod contracts, and optional backend-only Ollama text review. Its main focus is an accountable path from a report to a confirmed resolution, with explicit ownership and privacy boundaries.
