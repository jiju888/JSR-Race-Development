# Validation record

- Clean lockfile installation (`npm ci`): passed with Node 24.19.0.
- Production compilation and TypeScript checks: passed.
- Nine automated tests: passed. Includes segment boundaries, frame sampling, path traversal rejection, report plan validation, actual FFmpeg probing/extraction, host/password access, same-origin authority checks, chunked multipart parsing, duplicate/missing fields and malformed uploads.
- HTTP workflow smoke test: passed. Exercises rendered dashboard, external Host rejection, cross-origin write rejection, actual generated-video upload, saved session listing, byte-range playback, invalid range rejection, missing-key 503 response, corrupt-video rejection and complete session deletion.
- Production upload regression suite (`npm run test:uploads`): passed. Real streamed MP4 and MOV files at exactly 104,857,600 bytes, a chunked 12 MB upload, a chunked 100 MB + 1 byte rejection (413), corrupt video, foreign origins, unauthorized hosts, malformed multipart and JSON requests. Also verifies private disk cleanup, saved session listing and byte-range playback, with no Next body-exceeded warning. Runs the existing HTTP workflow checks against its test server.
- Test recordings are generated color patterns padded with valid container free-space atoms for size-boundary checks, not driving footage. Tests clean up their sessions.
- Live OpenAI request and coaching quality: **not tested**, because no API key is configured. No real AI report is claimed.
- Browser visual inspection, Mac execution, codec compatibility across browsers, and multi-user deployment: **not tested**. This is a local single-user first version; use H.264 MP4 recordings.
- Chat, telemetry, lap comparisons and measured progress trends: **not implemented**.

To repeat: `npm ci`, `npm test`, `npm run build`, `npm start`, then (in another terminal, with no AI key set) `node tests/http-smoke.mjs`.

The upload regression suite starts and stops its own production server: `npm run build && npm run test:uploads`. It needs FFmpeg, curl and a free port 3107.
