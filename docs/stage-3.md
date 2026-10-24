# Stage 3 — Reporting

Stage 3 is implemented on top of the existing Expo/Express/Mongoose application. Agency acceptance, transfers, tasks and resolution submission remain Stage 4. Announcements/scheduling and Ollama remain later stages. The existing demo confirmation/reopening controls are preserved without inventing new agency actions.

## Start and demo access

```powershell
cd C:\Users\9saiq\Desktop\Masar
npm.cmd run dev -- --clear
```

The launcher applies migrations, preserves environment files and existing passwords, and starts the API plus the correct mobile workspace. Scan with the supported Expo Go on the same Wi-Fi. Use `npm.cmd install` first on a fresh checkout. Do not launch Expo from the repository root directly.

Fresh-seed accounts: `user@demo.com` and `agency@demo.com`, password `MasarDemo!2026`. Agency access still has exactly the two fictional Noor/Madar memberships. New users get their own empty report list and private drafts.

Reporting transactions require a MongoDB replica set or sharded cluster; the user's configured MongoDB Atlas deployment supports this. Standalone local MongoDB is insufficient for report/draft/attachment transactions. No paid API or cloud storage is introduced.

## Resident flow

1. **Details:** title, observed facts, category or Not sure, up to three camera/library photos. Upload errors retain a retryable photo in memory; resolve or explicitly discard that upload before continuing. No password or token is stored in a draft.
2. **Location:** choose/search any point across Jordan, use foreground GPS, or enter a place/neighborhood and landmark without coordinates. Manual entry never invents GPS coordinates. Saved home may be selected initially; the screen explicitly asks the reporter to verify it is the incident location.
3. **Routing:** explicit manual routing, without AI output or automatic agency ownership.
4. **Review:** edit details/location, preview actual private photos, and optionally write a separate public summary. Category artwork is clearly labeled and is never attached as evidence.
5. **Success:** a real saved case number, submitted/awaiting manual review, nullable accepted owner and persistent timeline.

The Save button and successful Continue steps persist a database draft. Drafts are restored after app/API restart or on another authenticated device. Unsaved navigation offers save-and-leave, discard, or keep editing. A version check rejects stale writes rather than overwriting another device's changes. Explicit reload replaces current edits with the saved version. Report idempotency retains a stable submission UUID; reusing it with changed content returns a conflict. Commit and network-retry recovery never create another case.

## Database integrity

Submission uses one MongoDB transaction to create the incident, claim owned unattached photo records, append the initial event, generate the optional deduplicated submission receipt, and remove the matching draft. A stale draft version or conflicting photo claim aborts the transaction. The photo-removal and cleanup paths participate in the same ownership/state rules, preventing deletion of evidence during submission.

`ReportDraft` has a unique user index and version. `Incident` retains unique reporter/submission ID and case number constraints, plus paging indexes. Private timeline DTOs include message, actor, event type and UTC timestamp; internal visibility events are excluded. New submissions are real records, not demo fixtures. Migration `005-reporting` marks existing referenced photos as attached before enabling cleanup.

## Lists and details

My Reports uses cursor pagination (15 per page, API maximum 50), server-side literal search and All/Active/Your Action/Closed filters. There is no 200-record history ceiling. The Home/map snapshot remains a bounded recent-report view; older cases are available through My Reports and the dedicated details endpoint. Details are fetched by owned ID independently of any list cache, so an older/direct case URL remains usable.

Evidence thumbnails open a private full-image preview. Missing photos expose a retry state. Location without coordinates is displayed truthfully. Accepted owner, next action and timeline remain independently traceable. No new owner, progress, target time, legal responsibility or dispatch is fabricated.

## Privacy and community summaries

Reports remain private by default. Optional sharing requires a separate 15–240 character public summary and explains exactly what is published. The authenticated resident community feed returns only ID, title, public summary, category, status, timestamp and showcase flag. It excludes identity/account IDs, private description, evidence IDs/URLs, coordinates, landmarks, agency internals and timeline. Public text is reporter-authored: the UI warns against including personal details; there is no claim of AI/automatic PII detection.

The owner can revise or withdraw a shared summary from report details. This is a validated owner-only action with a private timeline event. Another resident cannot open the private case or change its visibility, even if the public summary is visible.

## Photo lifecycle

- JPEG/PNG input, maximum 2 MiB decoded input, 24 megapixels, three photos per report. Client resizing and server decoding/re-encoding strip original metadata. Videos/SVG and malformed images are rejected.
- Local `UPLOAD_DIR` contains random JPEG filenames; no static photo directory is exposed. Every retrieval requires the owning USER session. Agency evidence access is not granted prematurely.
- Uploaded files start unattached and expire after seven days unless referenced by a saved draft. Saving a draft refreshes expiry and protects its references. Submitted photos are attached evidence without an orphan expiry.
- Removing a photo first saves the revised draft, then safely removes the unused upload. Submitted evidence and photos still in a saved draft cannot be removed through the unused-upload endpoint.
- Discarded draft photos become eligible for cleanup. The worker runs at startup and hourly, rechecks draft/case references, atomically claims unused records, and retries interrupted file deletion. Untracked UUID JPEG files older than a day are recovered as interrupted uploads. Use a dedicated Masar-only upload directory and back it up with the database.
- Local storage remains a single-instance MVP deployment with the existing 300-photo account limit. Multi-replica/shared object storage is not introduced.

## Endpoints

All endpoints below inherit USER authorization; browser mutations retain origin validation and CSRF protection.

| Method/path | Behavior |
| --- | --- |
| GET `/resident/draft` | Own draft or null |
| POST `/resident/draft` | Validate fields, owned photos, compare version and persist |
| POST `/resident/draft/discard` | Compare version and discard own draft |
| POST `/resident/photos` | Private, validated, idempotent photo upload |
| POST `/resident/photos/:id/remove` | Remove owned unattached/unreferenced upload |
| GET `/resident/photos/:id` | Authorized private JPEG |
| POST `/resident/reports` | Transactional, idempotent case submission |
| GET `/resident/reports` | Owned paginated/searchable/filtered reports |
| GET `/resident/reports/:id` | Explicit owned-case DTO and private-safe timeline |
| POST `/resident/reports/:id/visibility` | Owner changes a separate public summary or withdraws it |
| GET `/resident/public-reports` | Explicitly redacted opt-in summaries |

## Verification

The user explicitly approved three Stage 3 database integration checks. They passed against a disposable real MongoDB replica set:

1. Persistent draft recovery after API reconstruction, stale-write rejection, concurrent idempotent submission, receipt deduplication, unassigned real-case state, manual location without fabricated coordinates, owned details and internal-event exclusion.
2. Paging through more than 200 records without duplicates, filtering/literal search, strict public DTO field allowlist, denial of another reporter's private details and sharing changes, and owner withdrawal from the community feed.
3. Draft/evidence retention during cleanup, attached-photo deletion rejection, removal of unreferenced expired files, version-safe draft discard and cleanup-versus-submission concurrency.

Repeat from `apps/api` with `node --jitless --no-lazy --import tsx --test --test-concurrency=1 test/stage3.test.ts`. It does not use the configured online database. A cached MongoDB Community Server binary is used/downloaded for a disposable process; it is not installed as a service.

Mobile/API TypeScript and ESLint passed. Expo web, Android and iOS exports passed. The migration was applied to the configured database without deleting reports/accounts. No physical-device camera/GPS or OS push testing was performed. Browser/native interaction and full accessibility/RTL QA are not claimed to be complete; those remain part of Stage 7.

Next: Stage 4 agency ownership workflows, only on user instruction.
