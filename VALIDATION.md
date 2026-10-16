# Validation record

- Clean lockfile installation (`npm ci`): passed with Node 24.19.0.
- Production compilation and TypeScript checks: passed.
- Five automated tests: passed. Includes segment boundaries, frame sample timestamps, path traversal rejection, report plan validation, and actual FFmpeg probing and frame extraction.
- HTTP workflow smoke test: passed. Exercises rendered dashboard, external Host rejection, cross-origin write rejection, actual generated-video upload, saved session listing, byte-range playback, invalid range rejection, missing-key 503 response, corrupt-video rejection and complete session deletion.
- Test recordings are generated color patterns, not driving footage. Tests clean up their sessions.
- Live OpenAI request and coaching quality: **not tested**, because no API key is configured. No real AI report is claimed.
- Browser visual inspection, Mac execution, codec compatibility across browsers, and multi-user deployment: **not tested**. This is a local single-user first version; use H.264 MP4 recordings.
- Chat, telemetry, lap comparisons and measured progress trends: **not implemented**.

To repeat: `npm ci`, `npm test`, `npm run build`, `npm start`, then (in another terminal, with no AI key set) `node tests/http-smoke.mjs`.
