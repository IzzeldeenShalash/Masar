# Resident workspace and Jordan map

This describes the first resident workspace revision. The completed [Stage 2 guide](stage-2.md) supersedes the earlier limitations about GPS, photo capture, subscriptions and Agency navigation below.

This extends the authentication build at the user's explicit request. Home, reports, Jordan map, area announcements, notifications and profile share the existing Expo application and MongoDB backend. Agency case management, real dispatch, uploads, and AI are not implemented by this update.

## Start

From the repository root, run `npm install`, then `npm run dev`. The launcher migrates and seeds the configured MongoDB database, starts Express and prints the Expo QR code. On PowerShell machines blocking npm.ps1, use `npm.cmd install` and `npm.cmd run dev`. Existing environment files are preserved. Do not expose MongoDB credentials to the mobile application.

## Real saved records and showcase examples

Signup creates an ordinary account with an empty report list. Reports save the user's title, description, category, landmark, chosen place name and exact coordinates. They start submitted and unassigned, with a durable timeline. Submission UUIDs are unique per reporter so retrying the same form does not create a second case. Only the reporter can retrieve or act on their cases; server DTOs omit other people's data. Profile name, private phone, biography, avatar color, location, followed areas and in-app preferences persist in MongoDB. Language persists on the device.

`user@demo.com` and `agency@demo.com` use `MasarDemo!2026` on a fresh seed. Existing passwords are preserved. The agency account has exactly two fictional memberships: Noor Electricity and Madar Roads. The demo user receives three clearly labeled showcase reports and two fictional area announcements. Ordinary users do not inherit these reports. They can opt into fictional demonstration area feeds in Profile; this does not restrict their real location. Existing legacy agencies/accounts are not deleted.

The seed does not reset edited profiles, report states or read receipts. Scheduled showcase announcements are static examples; this update does not implement an alert scheduler. A new report does not dispatch a real service, invent an accepted owner or close another report.

## All-Jordan location selection

The map covers Jordan's full geographic extent, including cities, towns, villages, rural areas and the eastern desert. It is not limited to the five fictional showcase districts. Users can pan, zoom and tap an arbitrary coordinate, or explicitly search for a place name. Chosen coordinates and place names are stored; a search failure does not block manual map selection. No device location permission or continuous tracking is used. Map pins show only the signed-in user's reports. Search and map datasets can omit individual addresses; this is not a guarantee of a complete national address register.

Leaflet 1.9.4 loads from unpkg. OpenStreetMap supplies map tiles with visible contributor attribution. Normal on-demand caching is retained; no bulk tile download/offline prefetch occurs. Native map requests identify Masar in their user agent; the map document allows an origin referrer. Map imagery and place search require internet. The view/coordinate guard uses a geographic bounding rectangle, not a legal border determination.

The backend proxies Photon place search, requests only after the user presses Find, limits each caller to 12 searches/minute, serializes upstream requests to at most one per 1.1 seconds, caches up to 500 queries for 24 hours, and filters results to country code JO. Queries go to the third-party provider, so search for public places rather than confidential personal information. `PHOTON_BASE_URL` can point to another compatible deployment; production needs shared caching/rate limiting when running multiple API replicas. Public Photon and OpenStreetMap services are best-effort services without an availability guarantee. See [Photon](https://photon.komoot.io/) and the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## API

All `/resident` endpoints require an authenticated USER session; browser mutations additionally retain origin and CSRF checks.

- `GET /resident`: explicit profile, latest 200 own reports, up to 100 matching announcements and 100 own notifications.
- `GET /resident/places?q=...`: Jordan-only public place search.
- `POST /resident/profile`: validated profile changes; role/email/agency changes are rejected.
- `POST /resident/reports`: validated, idempotent report creation.
- `POST /resident/reports/:id/action`: atomic citizen confirmation/reopening with a reason and ownership/status checks.
- `POST /resident/notifications/read`: read an owned notification or all owned notifications.

Notification settings affect new in-app notifications. Existing items remain visible. There is no OS push claim. Area announcements are persisted showcase content, not real published Jordanian service notices. Profile phone numbers are private and are not verified. Photo uploads and full agency publishing are later work, with no inert controls presented for them.

## Validation limits

At the user's request, no automated test suite or browser/device walkthrough was run for this update. Compilation and lint checks are recorded in the completion report. A physical-device map walkthrough, keyboard/RTL layout QA and live provider reachability remain unverified.

Completed: TypeScript checks for mobile/API, ESLint, Expo web export, Android JavaScript export and Android Hermes bytecode export. The Windows Hermes compiler crashed inside the sandbox; the same Android export succeeded outside it. The migration and idempotent seed completed against the configured MongoDB deployment. No physical-device behavior or live geocoder results were verified.
