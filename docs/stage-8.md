# Stage 8 — assistant, voice and community

Stage 8 extends the existing Expo/Express/MongoDB application. It adds no role and preserves the accepted-owner, transfer, task and citizen-confirmation workflow. No services were deployed or paid infrastructure provisioned.

## Run

From the root:

```powershell
npm.cmd install
npm.cmd run dev -- --clear
```

The launcher applies migration `010-community-assistant` and prints the Expo QR code. Scan on the same Wi-Fi; web opens at http://localhost:8081. Stop an existing launcher with Ctrl+C first. Existing demo logins/passwords are unchanged. Native microphone plugin changes require an SDK-compatible Expo Go or rebuilt development client.

Configuration is **only in the ignored `apps/api/.env`**. The supplied Gemini key is saved there, never in Expo or source control. Models were checked against Google's inventory and generation endpoint: an older listed model rejected generation, so a working replacement was selected. Model listings alone do not guarantee availability, modalities, quota or pricing.

```dotenv
ASSISTANT_PROVIDER=gemini
ASSISTANT_MODEL=gemini-3.5-flash-lite
GEMINI_API_KEY=YOUR_PRIVATE_KEY
AI_IMAGES_ENABLED=true
VOICE_PROVIDER=gemini
VOICE_MODEL=gemini-3.5-flash-lite
AI_TIMEOUT_MS=90000
```

Assistant and triage share `ASSISTANT_MODEL`. Adapters are `gemini`, `ollama`, `mock`, `disabled`. Local Ollama uses `ASSISTANT_MODEL` or falls back to `OLLAMA_MODEL`; the existing `qwen3:4b-instruct` passed a real Stage 8 structured improvement-draft check. Ollama is text-only here. The development mock is visibly labeled, allowed only in non-production demo mode, and never pretends to summarize discussions. Provider failure does not silently switch to a mock. Stage 6 endpoints remain compatible; the new review UI uses Stage 8.

Windows launcher/backend processes use `--jitless --no-lazy` with a scoped node-fetch HTTP preload. A bootstrap avoids optional native HTTP WebSocket getters that initialize the WASM parser; Socket.IO/ws remains available. This avoids optimizing JIT code without disabling AI/audio HTTP. Backend compiled-code caches are disabled and native startup crashes retry at most three times; database/configuration failures stop. Expo uses its normal runtime. The optional project-local Node 22 runtime does not replace system Node or weaken TLS.

## Product flows

- **Ask Masar:** available from Home/Profile and the desktop agency sidebar. Start/reopen persistent, paginated conversations. The assistant gets supplied application facts and bounded authorized records; it cannot execute queries or authorize actions. Only an explicit summary request includes the selected thread's latest 40 non-hidden messages.
- **Reviewable drafts:** Review & edit imports a suggestion into the existing three-step report form. Existing saved drafts are preserved. Wording, category, actual location, photos and public summary require human review; the assistant cannot submit.
- **Problems versus improvements:** repair an existing defect or request something new. Improvements require an explicit public community summary. Public DTOs omit precise location, private description, account identity and evidence photos. Support measures demand, not urgency or guaranteed approval/completion.
- **Triage:** title/description, existing category, advisory urgency/reason, database department, missing details, optional image observations and possible duplicates. Zod rejects malformed categories, invented IDs and observations without images. Location/category/recent time/relevant text narrow candidates to at most eight before inference. No auto-merge or assignment. An analysis attaches only to a matching owned submission. Staff can override urgency separately from support.
- **Community:** unique support/withdrawal, follow/unfollow, persistent discussions and private evidence. Improvement requests use the existing agency queues/workflow. Authorized staff review flags, hide/restore messages with reason/actor history and inspect private triage. Only the accepted lead records urgency.
- **Live discussions:** transactional save before broadcasting, retry deduplication, older/missed message pagination and reconnect authorization. Signals contain no message/private record payload. A New messages action preserves reading position.

## Voice and retention

Record → transcribe → edit transcript → send to assistant → review draft → explicitly submit. This is an uploaded recording, not a live call.

Limits are 60 seconds and 3 MB, enforced with server metadata checks. Native records AAC/M4A; web decodes/resamples to 16 kHz mono WAV to avoid missing WebM duration metadata. Permission/format/quota/playback errors leave text reporting available. Browser microphone access requires HTTPS or localhost. Google text/audio processing is disclosed with consent controls; image inclusion additionally requires the server flag and an explicit per-request choice.

Audio remains in request memory, with no Masar server audio files/logs. Temporary device recordings are deleted/released when discarded, transcribed or the recorder closes. Canceling cannot undo an upload already received by an external processor. Edited transcripts persist only when sent as conversation messages. Conversations and submitted evidence persist under existing storage rules. Google retention/terms depend on the account; Masar does not promise zero provider retention. Spoken replies use `expo-speech`, require an explicit action and offer Stop speech; voices depend on OS/browser support.

For self-hosted transcription:

```dotenv
VOICE_PROVIDER=whisper
WHISPER_URL=http://127.0.0.1:8082/inference
```

Install `whisper.cpp` separately with a multilingual model, then run, for example:

```powershell
whisper-server.exe --host 127.0.0.1 --port 8082 -m models/ggml-base.bin --convert
```

`--convert` needs FFmpeg for M4A conversion. Use a multilingual model, not `.en`, for Arabic. Keep the server trusted/local and unprivileged; manage its temporary-file retention separately. Nothing is installed as a system service. Multipart `file`, `language`, `response_format=json` is implemented and contract-tested. A real Whisper runtime was not installed/tested; Gemini avoids that local runtime requirement but needs audio-model access and consent.

## API, migration and security

Migration 010 creates conversation/turn, participation, message, flag, one-use socket-ticket and triage collections/indexes, and backfills historical incidents to `kind=problem`. No case is automatically assigned/resolved. Unique indexes enforce participation and message/turn retry keys; socket tickets expire after 60 seconds. No secrets are migrated.

| Routes | Purpose |
| --- | --- |
| `GET /assistant/status` | Provider/model/voice configuration |
| `GET/POST /assistant/conversations` | Own paginated conversations / create |
| `GET /assistant/conversations/:id` | Own paginated turns |
| `POST /assistant/conversations/:id/messages` | Idempotent assistant turn |
| `GET /assistant/drafts/:id` | Own suggestion |
| `POST /assistant/triage` | Validated advisory analysis |
| `POST /assistant/transcribe` | Bounded recording upload |
| `POST /realtime/ticket` | One-use authenticated ticket |
| `GET /community/requests` | Redacted public improvements |
| `GET /community/issues/:id` | Authorized progress summary |
| `POST /community/issues/:id/participation` | Support/follow |
| `GET/POST /issues/:id/messages` | Authorized pagination/idempotent send |
| `GET /issues/:id/messages/:messageId` | Single-message refresh |
| `POST /issues/:id/messages/:messageId/flag` | Report abuse |
| `GET /issues/:id/moderation` | Staff flag queue |
| `POST /issues/:id/messages/:messageId/moderate` | Staff hide/restore |
| `POST /issues/:id/urgency` | Accepted-lead override |
| `GET /issues/:id/triage` | Private reporter/staff analysis |

Existing cookies/CSRF/native bearer authorization precedes all endpoints. Rate limits cover AI, audio, messages, flags and joins. Socket origins, sessions, every join/send and broadcast recipient are checked; revoked sessions/changed visibility stop access. Events are `thread:join`, `thread:leave`, `thread:send`, `issue:changed`, `notifications:changed`; missed content loads through authorized HTTP. Evidence remains privately retrieved, not statically served. Text renders as text rather than executable HTML. Fan-out is for one API process; multiple processes need a shared Socket.IO adapter and distributed limits. OS push is not implemented.

## Motion and accessibility

Voice recorder follow-up: removed a literal inline JSX space that React Native tried to render inside a Card/View. Temporary-file cleanup now uses only a cached URI, never a released Expo shared object's getter. Explicit close stops recording before requesting unmount; async start/stop/transcription continuations check the component/session lifetime. Focused tests cover repeated cleanup/deletion failures and raw layout text regressions. The home banner now uses original Jordan-inspired generated artwork; see [prompt and provenance](home-artwork-v2.md).

Shared page entrances, button press/hover/focus, native fade transitions, expandable reviews, sheets, recording/AI/upload/submission progress, skeletons, success feedback, status timelines and new-message highlighting extend the existing design. Motion is short and honors reduced motion. The assistant launcher occupies normal layout space and does not cover bottom tabs. Arabic uses existing layout/text/identifier handling. Physical-device, screen-reader and full visual RTL sign-off remain pending.

## Verification and limits

Focused tests cover reviewed submission, private access, support uniqueness, message persistence/idempotency/pagination, moderation, triage IDs/categories/images, provider quota/malformed/timeout/missing credentials, socket authorization/revocation, and real duration validation. Local HTTP contract responders are explicitly test fixtures, not real inference.

The browser walkthrough verified sign-in, the labeled mock assistant, draft import, manual location review, optional triage, explicit public summary and successful submission into disposable MongoDB. Voice-disabled text fallback was also checked. After the key was supplied, real Gemini Arabic draft generation, schema-validated application triage and application transcription of synthetic English speech passed. Browser access became disabled in Work settings, blocking the rest of discussion/staff/RTL walkthrough and screenshots. No phone microphone/camera, OS speech voice, screen reader or closed-app push was tested. See [verification](verification.md) for final counts and real provider results.

Official documentation checked: [Google GenAI SDK](https://googleapis.github.io/js-genai/release_docs/index.html), [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [audio input](https://ai.google.dev/gemini-api/docs/generate-content/audio), [Whisper server](https://github.com/ggml-org/whisper.cpp/tree/master/examples/server).
