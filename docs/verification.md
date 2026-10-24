# Verification — 2026-10-24

## Windows startup repair

The Windows launcher/backend now use JIT-disabled compatibility mode, a node-fetch HTTP adapter and a bootstrap that avoids eager native HTTP WebSocket/WASM initialization. Backend transform/compile caches are disabled. Native-only startup failures retry at most three times; validation, credentials and normal database errors do not retry. Eight focused launcher/HTTP/provider checks and scoped lint passed. The exact `npm.cmd run dev -- --clear` command completed database setup, started the API and printed Expo's QR code. API health and the freshly served iOS bundle returned HTTP 200; real Gemini inference passed in the repaired runtime. Verification servers were stopped afterward. This reduces the observed startup failure modes; it is not a guarantee against all host-level native crashes.

## Stage 8 current verification

Final API regression: **50 tests, 49 passed, zero failed, one skipped** (the existing opt-in Stage 6 live Ollama test). Six mobile presentation tests and three launcher tests also passed. Stage 8 adds 14 focused integration/provider checks covering reviewable submission, authorization/privacy, support uniqueness, messages/moderation, socket authentication/revocation/idempotency/persistence, malformed/quota/timeout/missing-provider behavior and audio metadata/adapter contracts. API/mobile TypeScript and repository lint passed; Android/iOS/web production exports completed.

Real Stage 8 Ollama inference produced a validated improvement draft with `qwen3:4b-instruct`. With the subsequently supplied private key, real Gemini `gemini-3.5-flash-lite` generated an Arabic improvement draft. The final application adapter passed schema-validated Gemini triage and correctly transcribed synthetic English speech through the actual voice service. These are real provider calls using fictional/generated test content, not a phone-microphone test. No Gemini key is included in these docs or the mobile app. The key, assistant model and voice model are configured in the ignored backend environment.

The computer-use walkthrough used disposable MongoDB and an explicitly labeled mock provider: sign-in → assistant message → review draft → edit/import → manual location → optional triage → enable public summary → successful persisted improvement submission. Voice-disabled text fallback also worked. Browser access became disabled again before the discussion/staff/RTL walkthrough could finish; no complete visual sign-off or screenshots are claimed. No phone microphone, camera, OS playback voice or screen reader testing was performed.

Migration 010 was applied through the normal launcher to the configured development database; the API and Expo QR startup succeeded. All regression records used disposable databases. See [Stage 8](stage-8.md) for configuration, limits and new routes. Earlier verification sections remain historical.

## Stage 7 current verification

The user authorized the final regression run. **45 tests passed:** 36 disposable-MongoDB API checks (including real local Ollama inference), six presentation/contrast helper checks and three launcher configuration checks. API/mobile/test-project TypeScript and repository ESLint passed. Android, iOS and web production exports succeeded. See the [Stage 7 guide](stage-7.md) for changes, commands and limits.

Stage 7 scenario seeding was verified twice on disposable MongoDB, including preservation of changed report/alert states and existing ownership during a pending transfer. The optional scenario seed has not been applied to the configured online database by this verification. The final launcher smoke test used the configured development database and its normal idempotent migration/demo-account seed; regression tests did not use online records. API health, Expo iOS manifest and development bundle returned HTTP 200. The launcher printed its QR code, was stopped afterward, and ports 3001/8081 were verified free.

No Stage 7 interactive browser or physical-device walkthrough was performed: the browser tool still reports local browser use disabled. Native GPS/camera, screen readers, enlarged text and full visual RTL sign-off remain pending in the [device checklist](device-qa.md). OS push is not implemented. The sections below preserve historical evidence and may describe superseded configuration or earlier screens; this section and stage guides describe the current build.

## Historical Stage 1 record

An earlier user request stopped testing during the illustration/two-agency change. Subsequent explicit approvals authorized the later-stage and final checks recorded above.

Current stack: MongoDB/Mongoose, Express.js/Node.js, React Native/Expo and npm. This update adds the requested local `npx run dev` launcher, exactly two demo logins, and authorized agency selection.

## Stage 6 current verification

See [Stage 6 verification](stage-6.md#verification). Four approved disposable-database checks passed, including real local Ollama inference. API/mobile type checks, scoped lint and Android/iOS/web exports passed. Migration 009 was applied to the configured database. Browser/phone UI testing remains unverified; earlier stages below are historical.

## Stage 5 verification

See [Stage 5 verification](stage-5.md#verification). Six Stage 4/5 disposable-database checks passed. Migration 007 was applied to the configured database. A browser walkthrough was blocked by Work's local browser setting; no physical-device verification is claimed. The sections below are historical.

## Stage 4 verification

See [Stage 4 verification](stage-4.md#verification-and-limits). Three approved disposable-database integration checks passed, plus API/mobile TypeScript, scoped ESLint and final Android/iOS/web exports. Migration 006 was applied to the configured database. Physical-device GPS/camera testing was not performed. The following sections record historical Stage 1 checks and limits, rather than current database configuration.

## Stage 1 — Passed

- TypeScript checks for shared schemas, API and mobile.
- Workspace ESLint.
- Current web export and Android Hermes export both passed after the demo/selector/launcher update.
- **18 real HTTP API tests** with real isolated MongoDB, plus **3 launcher tests**.
- Fresh database has one USER (`user@demo.com`) and one AGENCY (`agency@demo.com`); two service organizations.
- Agency selection persists in the session and is restricted to server-assigned memberships. Single-agency accounts cannot switch into another organization; USER cannot select an agency.
- Signup, duplicate/concurrent email handling, privileged-field rejection, safe credentials errors, role middleware, persistence across API instances, revocation, expiry, cookie/CSRF/origin handling, rate limiting, malformed/oversized JSON and CORS preflight.
- Launcher chooses Wi-Fi LAN address, separates browser localhost from phone LAN API, supports address overrides, and rejects missing MongoDB URI, invalid ports and phone localhost.
- `npx --no-install run dev --check` resolves the project's local executable and correctly reports the empty online URI; no third-party `run` package is fetched.

## Actual npx startup smoke test

Ran the real `npx --no-install run dev` command under an interactive terminal, with an explicitly isolated temporary MongoDB URI supplied only to the test process. Observed migration/seed completion, Express startup, detected LAN API address, and **Expo's actual QR code**, Metro exp:// LAN URL and Expo Go instructions. No configured online database was contacted. Ctrl+C stopped the test servers.

Browser walkthrough against this running launcher:
- `agency@demo.com` signs in and sees Noor/Madar choices.
- Selecting Madar changes active agency; reload preserves Madar.
- Logout returns to login.
- `user@demo.com` reaches the USER landing.
- Screenshot: [single agency account and selection](screenshots/demo-agency-selection.png).

Earlier Stage 1 walkthroughs also covered signup, inline validation, invalid-login feedback, protected deep links, session reload, Arabic persistence and phone-width web layout. Earlier screenshots are historical and may contain the former demo addresses.

## Limits

The user's online MongoDB URL has not been supplied; `apps/api/.env` is ready with an empty MONGODB_URI. Its provider connectivity/access permissions are not verified. No phone or emulator scanned the QR during testing. Native SecureStore/restart, actual native splash, full RTL, screen-reader/enlarged-text testing and OS push are not claimed.

Native/web production exports and Expo dependency checks are recorded for the Stage 1 application; these verify bundling and package compatibility, not a physical client. Network-vs-expiry classification is unit-tested, not a phone outage walkthrough.

Environment files, tools, test binaries/logs, dependency folders and build output are ignored. Demo emails/passwords are intentionally public. No real mailbox creation, email verification, email delivery or password reset exists. No later stages implemented.
