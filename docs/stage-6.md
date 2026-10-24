# Stage 6 — Local report review and profile update

Stage 6 adds real backend-only Ollama review, validated suggestions, bounded duplicate candidates, persisted analysis metadata and manual fallback. The resident profile now follows the supplied reference: an original skyline header, account/edit card, contribution counts from the database, grouped preferences, a saved notification switch, help and About sheets, and sign out. No Stage 7 completion or physical-device QA is claimed.

## Start

From `C:\Users\9saiq\Desktop\Masar`, stop the previous development server with Ctrl+C, then:

```powershell
npm.cmd run dev -- --clear
```

Scan the new QR code in Expo Go. Clearing starts a new development login-reset marker as documented in Stage 5. Use `npm.cmd run dev` without `--clear` for normal session persistence.

Fresh demo accounts remain `user@demo.com` and `agency@demo.com`, password `MasarDemo!2026`. Existing passwords are preserved. No new accounts or agency privileges are required for AI.

## Configured local model

Ollama was found in `C:\Users\9saiq\AppData\Local\Programs\Ollama\ollama.exe`. Its local server was already running. The local `qwen3:4b-instruct` model was downloaded and verified through real inference. No cloud model, account, paid API, firewall change or system-service installation was introduced by this stage.

The ignored `apps/api/.env` is configured with:

```dotenv
AI_MODE=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b-instruct
AI_TIMEOUT_MS=90000
```

Existing database credentials were preserved. The model URL stays on the backend. The phone connects to the laptop API on port 3001, never directly to Ollama. Keep port 11434 private to the server.

For a new installation, install Ollama from its official distribution, then use:

```powershell
ollama pull qwen3:4b-instruct
ollama list
```

If the current terminal does not recognize `ollama`, its installed full path is usable:

```powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

Run `ollama serve` in a separate terminal only if its local server is stopped. Do not start a second server if it is already listening. Masar detects availability and installed tags through `/api/tags`; it never silently downloads a model or switches to a cloud model. To change models, install the desired local tag, put that exact tag in the backend environment, and restart Masar. The app reports missing, unconfigured, disabled and unavailable providers explicitly.

The chosen quantized tag is about 2.5 GB on disk. Runtime RAM exceeds the weight size and also depends on context, GPU offloading and other running applications. This laptop reported 16 GB RAM and passed real inference using an 8,192-token context setting. One cold run took about 57 seconds and a later warm run about 9 seconds; these are observations on this machine, not performance guarantees. The app permits manual submission while review is pending.

Sources: [Ollama Qwen3 tags](https://registry.ollama.com/library/qwen3/tags), [publisher model license](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507/blob/cdbee75f17c01a7cc42f958dc650907174af0554/LICENSE), [Qwen project](https://github.com/QwenLM/Qwen3). The publisher lists Apache 2.0 for these open-weight models. This does not imply that all model families or weights are OSI-open-source. Model weights live in the user's Ollama cache and are not distributed with the repository.

## Report flow

1. Enter report details and confirm the incident location as before.
2. On Review, choose Analyze text, or continue immediately with manual routing.
3. The result shows the provider/model, suggested category, factual summary, missing-information questions, suggested agencies, and their supplied fictional rule sources. Possible duplicates are suggestions; they do not merge cases or prevent a separate submission.
4. The original report remains editable. Changing its facts invalidates a mismatching analysis. AI never silently rewrites the report category or description.
5. Submission creates an unassigned case awaiting manual agency review. A matching, successful analysis is attached transactionally. The accepted lead can change only through the existing agency workflow.

Persisted analysis is visible on the reporter's case and the authorized agency workspace. Agency case DTOs omit duplicate IDs/titles; they do not gain access to unrelated cases through AI suggestions. Own-analysis retrieval rechecks candidate visibility so withdrawn public summaries are not returned as accessible duplicates.

## Boundaries and validation

- Only report text is analyzed. Photos are neither transmitted to the model nor inspected. Voice transcription and image understanding remain deferred.
- Duplicate candidates are filtered deterministically by selected category (or unsure), a 14-day window, open status, and a 2.5 km distance bound when coordinates exist. Without coordinates, the place label must match. Database reads are capped before final filtering, and at most five candidates reach the model.
- Candidate references include only the reporter's own reports or explicitly public summaries. Other reporters' private cases are excluded. Private candidate descriptions/evidence are not sent even for the reporter's own existing cases; the model receives only a generic reference in that case. Exact coordinates are used for backend filtering, not sent in candidate records.
- Agency rules are explicitly fictional and seeded only for Noor/Madar. A category without an applicable supplied rule remains manually routed; the model cannot invent another agency or legal assignment.
- `/api/chat` uses nonstreaming JSON-schema structured output and Zod validation. Unknown agency/rule/candidate IDs, mismatched rule ownership/category, duplicate references and extra fields are rejected.
- Report text and reference text are untrusted data. The model gets no tools, database credentials, session tokens, account email, phone, photos or write capability. Suggestions cannot dispatch, accept ownership, transfer, merge, publish, estimate restoration or close a report.
- One repair retry is permitted for invalid model content, under one shared inference deadline. A provider failure/timeout shows manual recovery, never fake success. A single backend inference is allowed at a time, with a separate per-IP review rate limit.
- Successful and failed analyses persist provider, model, schema version, input digest, reference IDs, attempts, duration and status. Raw prompts and invalid raw model responses are not logged/stored. Repeating a successful identical review uses its database record.

`AI_MODE=disabled` explicitly disables review. `AI_MODE=fixture` is allowed only in nonproduction demo mode and always displays **Demo AI · deterministic fixture**. It is not a fallback for failed Ollama calls and was not used for the real inference verification.

Implementation follows [Ollama structured-output documentation](https://ollama.com/blog/structured-outputs). Model results remain advisory even when they satisfy the schema.

## API and storage

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/resident/ai/status` | Provider state, configured model and bounded installed-tag list |
| POST | `/resident/ai/analyze` | Strict report-text input and optional validated review |
| GET | `/resident/ai/analyses/:id` | Own successful analysis, with duplicate visibility checks |
| POST | `/resident/reports` | Optional matching analysis ID; manual submission still works |
| POST | `/resident/preferences` | Strict report/area notification settings without overwriting the profile |
| GET | `/resident` | Contribution totals across all own reports, separate from the recent-report limit |

Migration 009 creates analysis/rule indexes, the user/status contribution index and fictional rules for existing agencies. Repeatable demo seeding also supplies rules after creating agencies on a fresh database. The migration was applied to the configured online MongoDB. Model execution does not write incident state; only the ordinary report submission transaction attaches a matching analysis.

## Verification

The user approved focused Stage 6 checks. Four passed using a disposable MongoDB replica set:

1. Unknown references trigger at most one repair retry, invalid review status persists, and manual submission creates an unassigned case.
2. Validated repair, cache reuse, matching report attachment, private-analysis access, bounded candidates and redacted case DTOs.
3. Bounded timeout recovery, complete own contribution counts beyond the recent-report limit, and strict persisted notification settings.
4. Real local `qwen3:4b-instruct` inference through the backend, validated/saved review and unassigned report creation. It passed again after duplicate-privacy tightening.

The simulated provider in negative tests is isolated test infrastructure, not an application fallback. Real inference is separately identified above. Online records were not used for these tests.

API/mobile TypeScript, scoped ESLint, and Android/iOS/web exports passed. This Windows Node runtime intermittently crashes in V8; compiler/lint checks succeeded using its existing jitless workaround, which is not applied to Expo. Browser automation still reports local browser access disabled in Work settings, so a UI walkthrough was unavailable. Native touch, camera, GPS accuracy, full RTL/accessibility and OS push were not device-tested here.

Stage 7 polish, physical-device walkthrough, full Arabic/RTL and accessibility QA are next, awaiting instruction.
