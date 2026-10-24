# Third-party software and assets

Original Masar source is MIT licensed. Dependencies retain their own licenses. The lockfile pins the resolved dependency graph; installed package LICENSE/NOTICE files remain authoritative for full texts and transitive obligations.

| Component | License |
| --- | --- |
| Expo modules, Expo Router, React, React Native, React Native Web | MIT |
| Express, cors, cookie-parser and express-rate-limit | MIT |
| Mongoose | MIT |
| MongoDB Node.js driver | Apache-2.0 |
| Zod, React Hook Form/resolvers, TanStack Query | MIT |
| @node-rs/argon2 | MIT |
| AsyncStorage, safe-area-context, react-native-screens | MIT |
| dotenv, tsx, ESLint/typescript-eslint | MIT |
| TypeScript | Apache-2.0 |
| mongodb-memory-server (test harness) | MIT |
| Lightning CSS (Expo CSS tooling) | MPL-2.0 |
| MongoDB Community Server (separate runtime/test download) | Server Side Public License (SSPL), not MIT or OSI open-source |

Tests download an official MongoDB Community Server binary for a local disposable process. It is not included in the source distribution; its SSPL license is separate from the MIT Node test launcher. Use your own appropriately licensed MongoDB instance for normal development. No paid service is required. Review relevant licenses before redistribution or hosting.

The Masar mark combines original vector paths with typography and platform system fonts. The vector symbol and profile skyline are included under the project's MIT license. The welcome illustration was cleaned with the built-in imagegen tool from the user-supplied UI reference; the source reference retains its original rights. See docs/welcome-artwork.md for its prompt and provenance. Ionicons is MIT licensed. No government logos, agency seals, or model weights are included.

Stage 6 uses the separately installed Ollama runtime (MIT) and the local `qwen3:4b-instruct` model. Qwen publishes its Qwen3-4B-Instruct-2507 weights under Apache 2.0: https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507/blob/main/LICENSE. The quantized Ollama package is listed at https://ollama.com/library/qwen3:4b-instruct. Weights are in the user's Ollama cache, not this repository. Review the selected model's own license when changing or redistributing models; open-weight is not automatically OSI-open-source. See docs/stage-6.md for setup, source and memory notes.

React Native SVG and React Native WebView are MIT licensed. Leaflet 1.9.4 is BSD-2-Clause licensed and is loaded from unpkg for map rendering. Map/search data is © OpenStreetMap contributors under ODbL; visible map attribution links to https://www.openstreetmap.org/copyright. Photon software is Apache-2.0 licensed; the public search deployment is operated by komoot. Map tiles and place search are external, best-effort services subject to their providers' usage terms; they are not bundled map datasets. See docs/resident-workspace.md for the usage limits and configuration.

Expo Location, ImagePicker and ImageManipulator are MIT licensed. Sharp is Apache-2.0 licensed; its libvips runtime and bundled codecs retain their own licenses (including LGPL-2.1-or-later for libvips). Installed dependency LICENSE/NOTICE files are authoritative. The local showcase streetlight and sidewalk images were generated with imagegen for this application and are illustrative, not real incident evidence. Their prompts/provenance are recorded in docs/stage-2-artwork.md.
Stage 8 adds the official `@google/genai` SDK (Apache-2.0), Socket.IO/server/client (MIT), music-metadata (MIT), and Expo Audio/Speech/FileSystem (MIT). Gemini is an external provider governed by its service terms and the account's quota/pricing/retention, not a bundled model. Optional whisper.cpp is separately installed (MIT); model weights and FFmpeg builds retain their own licenses. No Whisper model or FFmpeg binary is bundled. Review installed LICENSE/NOTICE files before distribution.
The Windows development compatibility HTTP adapter uses node-fetch 3 (MIT) and its dependency licenses. It preserves ordinary TLS verification and does not modify Expo's network/runtime behavior.
