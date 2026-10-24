# Stage 2: locations, navigation and profile

The [Stage 3 guide](stage-3.md) supersedes the earlier draft/upload/pagination limitations below. Stage 3 adds a protected photo lifecycle and transactional reporting; its replica-set database requirement also applies when repeating the Stage 2 integration checks.

Implemented at the user's request, including the explicitly requested camera/photo slice of Stage 3. Later agency case operations, publishing, scheduling and AI remain outside this stage.

## Run

From the repository root:

```powershell
npm.cmd install
npm.cmd run dev -- --clear
```

Keep the phone and computer on the same Wi-Fi and scan with the supported Expo Go. The launcher applies migrations and starts Express plus the mobile workspace. Existing `.env` files are preserved. Never launch Expo from the repository root directly. Windows backend processes use `--jitless --no-lazy`; those flags are not applied to Metro, which needs WebAssembly.

Fresh-seed demo logins are `user@demo.com` and `agency@demo.com`, both using `MasarDemo!2026`. Existing passwords are preserved. The one agency member has Noor Electricity and Madar Roads memberships. Both agencies remain fictional.

## Completed flows

- First resident login requires an explicit home-location choice; the existing Amman fallback does not silently complete setup. Search, manual map selection and GPS are available. Setup can change language or sign out.
- GPS requests foreground permission only after pressing **Use my current location**. It requests a current reading, rejects stale readings older than two minutes, shows accuracy/time, handles denial/services-off/timeouts, and offers Settings when permission is permanently blocked. A position outside the Jordan map extent produces a clear error rather than substituting Amman. No background tracking or continuous watcher is used.
- The blue marker and accuracy circle represent a real GPS reading only. Teal represents the selected point. Saving home does not assert that a later device position is still the same place.
- All Jordan can be searched or selected, including villages and rural/desert locations. Search results are country-filtered to JO. The map's coordinate guard is a geographic rectangle, not an official border check or a complete address register.
- Residents can change home and save/remove up to ten other places. These persist as server-managed Neighborhood and Subscription records. Custom labels are private per subscription, including when two people select identical coordinates. Saved points are not claimed to be official service boundaries.
- NotificationPreference records are separate from area subscriptions. Disabling report updates prevents new submission receipts; existing notifications remain visible. Area preferences are stored for future publication events. No device push is claimed.
- Home, Reports, Alerts and Profile tabs remain protected. Agency Overview, Reports, Alerts and Profile tabs include a sidebar on wide screens. Agency role/membership switching and profile updates are enforced server-side. Agency report/publishing views explicitly describe the later stages rather than showing fictional operational counts.
- Profile edits validate name, optional private phone, biography and avatar color; save/failure/unsaved-discard states work. Locale persists locally, with explicit RTL layout/text direction. Email remains the sign-in address; no fake verification/reset controls are included.
- Camera and library selection attach up to three photos to the existing report flow. Cancellation preserves the form. Return from the system camera now revalidates an already-validated session in the background, preserving the report form; revoked sessions are still rejected.
- Photos resize/re-encode on the client, then are decoded and re-encoded on the server. The server accepts JPEG/PNG only, limits input to 2 MiB / 24 megapixels, writes JPEG output without original metadata, uses random filenames and owns every upload by authenticated user. Retrieval requires that same USER account; there is no static uploads directory. Photo-upload retries reuse an upload UUID. Report retries retain their submission UUID.
- Private photos display in report cards/details. Showcase examples use local generated illustrations, explicitly labeled as examples rather than evidence. New reports remain real saved records, submitted and unassigned.

## Storage and deployment

`UPLOAD_DIR=uploads` defaults to `apps/api/uploads` when using the launcher. This folder is ignored by Git and must be backed up with the database for deployment. Maximum stored photos per account is currently 300. Removing a photo from an unsubmitted form detaches it from that form; it does not erase its private server copy. A persistent draft/orphan-photo lifecycle and account storage management belong to the full Stage 3 upload work. Do not deploy multiple API replicas with separate local filesystems.

Web GPS/camera need HTTPS or localhost and browser support; local HTTP on a laptop LAN address is not a secure browser origin. Native Expo Go on a physical phone can use the OS permission flow. Custom development/production clients must be rebuilt after permission plugin changes. System camera availability depends on device/OS; a simulator cannot prove physical camera capture.

Map/search require internet. Photon place search is explicit, throttled and cached; OpenStreetMap attribution remains visible. No paid key is required. No law, responsibility or official partnership is inferred from real Jordan map data. Showcase announcements remain fictional and independently tracked from reports.

## Verification

Three explicitly user-approved HTTP integration checks passed against a disposable real MongoDB process:

1. Onboarding/home/follows/preferences persistence, unfollowing, privileged-field rejection and private labels at identical coordinates.
2. Image decoding/metadata removal, private retrieval/role isolation, invalid-image rejection, attachment ownership and idempotent real report submission.
3. Agency settings persistence and rejection of role/membership changes through profile input.

Mobile/API TypeScript checks and ESLint passed. Expo web, Android and iOS exports passed; physical camera/GPS operation, real iOS permission dialogs, live place-provider availability and full accessibility/RTL QA have not been device-tested. No claim is made that every OS/browser combination has been exercised.

Focused checks can be repeated from `apps/api` with `node --jitless --no-lazy --import tsx --test --test-concurrency=1 test/stage2.test.ts`. This uses a disposable local MongoDB binary, not your configured Atlas database, and may download the separate MongoDB Community Server runtime the first time.

Next stage: complete Stage 3 reporting, including the full upload lifecycle, pagination and reporting polish. Proceed only when the user requests it.
