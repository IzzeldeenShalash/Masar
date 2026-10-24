# MASAR | مسار

**One report. A clear path to resolution.**  
**بلاغك واضح، ومساره معروف.**

React Native + Expo, Express.js + Node.js, MongoDB + Mongoose, TypeScript and npm. Authentication plus the resident home, Jordan map, reports, alerts and profile workspace. Reports and profile changes are saved to MongoDB; showcase records are labeled separately. All service agencies are fictional; no real dispatch or government integration.

See [resident workspace and Jordan location guide](docs/resident-workspace.md) for the new screens, saved data, map providers and current limitations.

**Stage 2 is implemented:** first-login home setup, real foreground GPS, followed places across Jordan, resident/agency navigation, profile/preferences, and the requested camera/private photo attachment flow. See the [Stage 2 guide](docs/stage-2.md) for permissions, verification, storage and remaining Stage 3 work.

**Stage 3 is implemented:** versioned database drafts, manual routing, optional coordinate-free locations, transactional/idempotent submission, private photo lifecycle, paginated reports/details/timelines, and opt-in redacted community summaries. See the [Stage 3 guide](docs/stage-3.md).

**Stage 4 is implemented:** agency acceptance, accountable transfers, shared tasks, public updates/private notes, completion evidence, citizen confirmation/reopening, report notifications and tracking. Home and new reports reuse foreground GPS after permission; saved drafts keep their incident location. See the [Stage 4 guide](docs/stage-4.md).

**Stage 5 is implemented:** saved announcement drafts, area/subscriber preview, explicit publication/scheduling, updates, revised estimates, cancellation/resolution, linked cases, targeted in-app notifications and a persistent scheduling worker. See the [Stage 5 guide](docs/stage-5.md).

**Stage 6 is implemented:** real backend Ollama text review, validated fictional agency/rule references, bounded duplicate suggestions, saved analysis metadata and manual fallback. The profile has a new skyline layout, real contribution counts, working notification preferences and help. Local `qwen3:4b-instruct` was downloaded/configured and passed real inference checks. See the [Stage 6 guide](docs/stage-6.md) for setup, model/license/memory notes and verification.

**Stage 7 polish is implemented:** Arabic identifier/date/status presentation, accessible control states and reduced motion, responsive agency sidebar/case workspace, private saved-point precision, working optional showcase subscriptions, and an additive walkthrough seed. All 45 automated checks and Android/iOS/web exports passed. Physical-device and full visual RTL/accessibility sign-off remain pending; the local browser tool is still unavailable. See the [Stage 7 guide](docs/stage-7.md), [demo script](docs/demo-script.md) and [device checklist](docs/device-qa.md).

Optional showcase setup: stop the launcher and run `npm.cmd run demo:scenarios`, then `npm.cmd run dev -- --clear`. This writes clearly fictional cases/notices to your configured development database, preserves existing passwords and changed case/alert states, and requires demo mode. It is not run automatically during ordinary startup.

## Run and scan

**Stage 8 is implemented:** persistent Arabic/English assistant conversations, reviewable AI drafts and triage, voice recording/transcript editing, community improvement requests with unique support/follows, and authorized real-time issue discussions/moderation. The supplied Gemini key is stored only in the ignored backend environment; the working model is `gemini-3.5-flash-lite`. See [Stage 8 setup, privacy, API and voice requirements](docs/stage-8.md). No deployment or paid service provisioning was performed.

Start from the root with `npm run dev`. To clear Metro's cache while starting both the API and the correct mobile workspace, use `npm run dev -- --clear` (or `npm.cmd run dev -- --clear` in PowerShell). In development, `--clear` now also returns each connected client to the welcome screen once for that run, revoking its existing session. Choose Get started or Sign in there. Starting without it preserves normal sessions. Running `npx expo start` from the repository root starts the wrong project and causes the missing `../../App` error. Standalone Expo commands belong in `apps/mobile` and do not start the API.

On Windows the launcher/API use `--jitless --no-lazy` compatibility mode and a scoped node-fetch HTTP adapter to avoid native V8 compiler crashes while keeping Gemini, Ollama and audio requests working. Backend compiled-code caches are disabled. Idempotent setup and API startup retry native crashes at most three times; database/configuration errors still stop immediately. Expo runs without these flags. Do not set `NODE_OPTIONS=--jitless` globally. The backend warning about disabled `expose_wasm` is expected in this mode.

Requires supported Node 22 LTS (22.23.4+) or Node 24 LTS (24.15+), and npm. This laptop uses a checksum-verified Node 22.23.4 runtime in `.local/node-runtime/` for the development launcher after native crashes in the installed Node 24 runtime. It does not replace system Node or change TLS verification. The installed Expo/React Native/Metro packages support both runtime lines. From this folder:

```powershell
npm install
```

Open **`apps/api/.env`** (created for you; ignored by Git) and paste your **online MongoDB URL**:

```dotenv
MONGODB_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER/masar?retryWrites=true&w=majority
```

Use your database user's credentials, not your MongoDB website login. URL-encode special characters in the password. The URI stays on the backend and is never sent to Expo/your phone. Keep it out of chat and source control.

Then, from the project root:

```powershell
npm.cmd run dev -- --clear
```

This project's local `run` launcher:
1. Checks your configuration and available ports.
2. Connects to your configured MongoDB, applies migrations, and seeds the two demo logins when `DEMO_MODE=true`.
3. Starts the Express API.
4. Detects the laptop LAN address and supplies it to the Expo app.
5. Starts Expo Go in LAN mode and displays the QR code.

Scan the QR in Expo Go with phone and laptop on the same Wi-Fi. Keep the terminal running. Ctrl+C stops both servers. `npm run dev` is an equivalent alias. No global `run` package is required; run `npm install` before using the local command. The launcher invokes the same Expo CLI as `npx expo start --go --lan`.

The launcher copies missing per-app `.env.example` files without overwriting existing configuration. It stops with a helpful message when the database URL is blank, invalid, or unreachable; it never falls back to a fake/local database. No firewall changes or system services are installed.

## Exactly two demo logins

| Role | Masar login email | App password |
| --- | --- | --- |
| User | `user@demo.com` | `MasarDemo!2026` |
| Agency | `agency@demo.com` | `MasarDemo!2026` |

The one Agency account has server-assigned membership in **Noor Electricity and Madar Roads**. After login, choose the agency workspace. Selection is saved in the session. It is still the AGENCY role, not an administrator. An ordinary single-agency member cannot switch into an agency they do not belong to.

Other users register with their own valid email addresses. The system does not send email, verify inbox ownership, or provide password recovery at this stage. Demo addresses are app login identifiers, not newly created email inboxes; the app password is unrelated to any email-provider password.

On a fresh database, seeding creates two fictional service organizations and exactly two accounts. It is repeatable and preserves existing passwords. It refuses to promote an existing USER occupying the agency demo email. Existing accounts from earlier project versions are preserved rather than deleted. Seeding is disabled in production and requires demo mode.

## Online MongoDB setup and connections

Use a dedicated development database. Your provider must allow the laptop's connection, and the database user needs collection/index creation and validator permissions for migrations. If using MongoDB Atlas, check your database user's permissions, network access list, hostname and password encoding when connection fails. This project does not change cloud account/network settings.

The phone connects to **the Express API on your laptop**, not directly to MongoDB. The API binds to `0.0.0.0:3001` by default. On a physical phone, localhost means the phone. On an Android emulator, a manual API URL is `http://10.0.2.2:3001`.

Automatic LAN detection prefers Wi-Fi over virtual adapters. If the chosen address is wrong, set `EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_LAN_IP:3001` in `apps/mobile/.env` and restart the launcher. For local browser use, the launcher separately sets `EXPO_PUBLIC_WEB_API_URL=http://localhost:3001`, preserving same-site cookies. It adds the detected web origin to the development API allowlist.

Expo SDK **58** dependencies were installed through Expo-compatible commands. Use an SDK 58 Expo Go client or development build. The [SDK 58 release notes](https://expo.dev/changelog/sdk-58) describe the store rollout; see [Expo Go compatibility](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/). Package compatibility checks do not verify the client's installed app.

A locally configured Android SDK/JDK can build a debug app with `npm exec --workspace=@masar/mobile -- expo run:android`. No paid build service is needed.

## Separate commands and verification

The one-command launcher handles normal development. Separate commands remain available:

```powershell
npm run db:migrate
npm run db:seed
npm run api
npm run mobile
npm run web
```

Do not run a second API or Expo process alongside the launcher. For manual Expo startup, configure its API URL yourself.

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run expo:check
npm run export:web
npm run export:android
```

Tests use an isolated real temporary MongoDB, never your online URI. The first test run downloads an official MongoDB Community binary (about 778 MB on Windows); `MONGOMS_SYSTEM_BINARY` can select an installed binary. To cache it in the ignored project folder:

```powershell
$env:MONGOMS_DOWNLOAD_DIR = "$PWD/.local/mongodb-binaries"
npm test
```

`npm run export:web` then `npm run test:preview` starts an explicitly disposable real API/database preview on ports 3001/8081. It is a separate test workflow, not an automatic fallback for your online database. Tests cover both demo roles, sessions, signup, CSRF, role authorization, agency membership and LAN configuration. See [verification](docs/verification.md).

## Security and limits

Native sessions use SecureStore and Bearer headers. Web sessions use an HttpOnly, SameSite=Strict cookie plus origin checks and an in-memory CSRF token for mutations. Passwords use Argon2id; only digests of opaque session tokens are stored in MongoDB. Public signup creates USER only. Portal selection grants no permissions.

API/database failures are distinct from expired sessions. Protected content stays hidden until validation; temporary failure retains saved credentials. Logout revokes the server session. No passwords, tokens or MongoDB URLs are logged.

Local HTTP uses `COOKIE_SECURE=false`. Deployment requires HTTPS, secure cookies, exact HTTPS origins, same-site API hosting, a dedicated database without public demo accounts, and separately secured MongoDB access. Current rate limits are per process/IP with no trusted proxy. This is not production readiness certification.

English/Arabic selection persists, with explicit mirrored rows and text directions; no direction reload is required for these screens. Full native RTL, accessibility and physical-device QA remain Stage 7. No physical-device testing is claimed.

Thin routes live in `apps/mobile/app`; features/components/auth/API/i18n code lives in `apps/mobile/src`. `apps/api` owns MongoDB, Express, sessions, migrations and seeds. `packages/shared` owns contracts; `packages/dev-cli` owns the local `npx run dev` command. See [architecture](docs/architecture.md) and [API](docs/api.md).

The resident workspace includes persistent report drafts, real saved reports, a protected photo lifecycle, location/profile preferences, a Jordan map, in-app report receipts and persisted showcase announcements. Agency ownership/publishing workflows, scheduling, OS push and AI remain later work. Original code: MIT; see [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md).

The latest welcome/login/signup design follows the supplied reference, with a standalone neighborhood illustration, a reduced-motion-aware brand entrance, and fixed-viewport account screens. Compact form steps handle very small available areas. Demo agency access is now limited to Noor and Madar; other existing service-agency records are not deleted.
