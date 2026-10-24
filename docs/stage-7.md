# Stage 7 — polish and walkthrough

Implemented on 24 October 2026. Automated verification passed; physical-device and visual accessibility sign-off remain pending. This is a fictional hackathon application with no government integration or real dispatch.

## What changed

- Arabic presentation now isolates emails, case IDs and coordinates, localizes Gregorian timestamps, numbers, transfer states and service-area labels. User and agency text remains in its original language.
- Language persists locally. Web updates the document language/direction. Native uses scoped layout direction, explicit text alignment and directional icons; this implementation does not require a native direction reload.
- Shared controls have visible keyboard focus, disabled/busy semantics, stronger input boundaries, readable errors and at least 44–48 logical pixel touch targets. Palette contrast is checked for the shared text/status colors and control boundaries; this is not a WCAG certification of every screen.
- Sheets respect reduced motion; maps disable animated recentering when reduced motion is requested. Authentication can scroll on short screens or with enlarged text so fields remain reachable. Detail pages include bottom safe-area padding.
- Desktop agency views have a persistent navigation sidebar at 1000px and a two-column case workspace at 1100px. Mobile retains tabs and a single-column workspace using the same feature code and authorization.
- Report-update polling stops when unfocused. Location search results remain in the layout instead of overlapping fields.
- Followed places preserve their selected exact point privately. Public targeting still uses coarse server-side service-area IDs. Historical followed places without stored exact coordinates retain their coarse fallback until updated.
- Optional fictional showcase follows now create actual subscriptions. Unfollowing removes subscription-based alert access; ownership of an explicitly linked report can still grant access under the existing rules.
- Added a repeatable, opt-in showcase seed for two linked electricity reports, an independently accountable transfer/task case, one active electricity announcement and one scheduled road closure. It preserves changed case/alert states and existing passwords.

## Run

From the repository root in PowerShell:

```powershell
npm.cmd install
npm.cmd run dev -- --clear
```

Configure the private `apps/api/.env` with your MongoDB URI. The launcher starts the API and Expo, detects the laptop LAN address and prints the Expo Go QR code. Scan on the same Wi-Fi. `--clear` returns a connected client to Welcome once for that development run; normal startup preserves sessions. Stop the existing launcher with Ctrl+C before starting another.

Optional: stop the launcher, then add the clearly labeled showcase scenarios to your configured development database:

```powershell
npm.cmd run demo:scenarios
npm.cmd run dev -- --clear
```

The showcase command writes records to the configured database, requires `DEMO_MODE=true`, and refuses production mode. Stage 7 verification exercised it only against disposable MongoDB. It is not automatically run on normal startup. No real evidence photographs are fabricated or added by this seed.

Demo login identifiers: `user@demo.com` and `agency@demo.com`. Fresh seeded password: `MasarDemo!2026`; reseeding preserves existing passwords. The agency account can select the fictional Noor Electricity and Madar Roads workspaces. These are application accounts, not mailboxes.

## Verification

- 36 API integration tests passed with disposable MongoDB, including the real local Ollama test (`RUN_REAL_OLLAMA=true`), authorization, privacy, transfers/tasks/resolution, alert targeting/scheduling/deduplication and Stage 7 subscription/seed regressions.
- Six presentation helper tests passed: locale normalization, Arabic identifiers, transfer labels, Gregorian timestamps, service-area labels and shared palette contrast.
- Three launcher configuration tests passed.
- Shared/API/mobile TypeScript, the mobile test TypeScript project, and repository ESLint passed.
- Expo production exports completed for Android, iOS and web into ignored `apps/mobile/dist-stage7`.
- Expo dependency compatibility passed against the locally installed SDK map in offline mode. The online compatibility check did not complete, so no fresh remote version-map verification is claimed.
- Final startup smoke: normal database setup, API readiness, Expo QR generation, iOS manifest and development bundle succeeded (HTTP 200). Test servers were stopped afterward and ports 3001/8081 were free. This checks serving the bundle, not opening it on a physical phone.

Repeat the checks with supported Node and dependencies installed:

```powershell
npm.cmd run typecheck
npm.cmd run lint
$env:RUN_REAL_OLLAMA = 'true'
npm.cmd test
```

The live AI test requires the configured local model. Without that opt-in, it is skipped. Export checks compile assets; they do not prove native permissions or visual layout on a phone.

## Remaining hands-on review

The local browser tool still reports that browser use is disabled in Work settings, so this turn did not complete an interactive browser walkthrough. No phone, emulator, screen reader or OS push delivery was tested. See the [device checklist](device-qa.md) and [demo script](demo-script.md). Full native RTL, enlarged-text, permission and keyboard/visual sign-off must be completed on the target devices before presenting this as device-verified.
