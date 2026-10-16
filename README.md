# JSR Race Intelligence

**Analyze. Understand. Improve.** A functional first milestone for a local, single-driver sim racing video coach. Built with Next.js, TypeScript, Tailwind CSS, FFmpeg, and OpenAI vision. No MOZA affiliation or direct hardware integration.

Clone this repository using the instructions below. If you downloaded a ZIP instead, extract it and open Terminal in the extracted project folder, then continue with step 3.

## Run on your Mac

1. Install Node.js **22 or 24 LTS** from https://nodejs.org. Install Homebrew from https://brew.sh if you do not already have it, then run `brew install ffmpeg` in Terminal.
2. Open Terminal and download this repository: `git clone https://github.com/jiju888/JSR-Race-Development.git`, then `cd JSR-Race-Development`.
3. Run `npm ci`.
4. Run `cp .env.example .env.local`. Open `.env.local` in a text editor and set `OPENAI_API_KEY` to your own key from https://platform.openai.com/api-keys. API billing is separate from ChatGPT subscriptions. Never commit this file or share your key. The key stays on the server. Optional `OPENAI_MODEL` defaults to `gpt-4.1-mini` and must support images and structured outputs.
5. Run `npm run dev` and open http://localhost:3000 in your browser. Stop with Control-C.

For a production build: `npm run build`, then `npm start`. FFmpeg and ffprobe must be on PATH. `npm test` runs validation and real video extraction tests; `npm run typecheck` checks TypeScript.

## Use it

Select **Analyze Session**, upload an MP4 or MOV (100 MB maximum, 30 minutes maximum), and enter simulator, track and vehicle. Play the uploaded video, use the playhead to set segment start/end, and name the corner. Select a segment up to 30 seconds long and press **Generate AI coaching**. Six timestamped frames and your metadata are sent to OpenAI; the original recording is not sent. This can incur API charges. No key means a clear setup error, never simulated coaching.

The report includes strengths, improvements, corner observations with evidence and confidence, limitations, and three next-session exercises. Supporting frames seek the video when clicked. The overview and Progress pages list real saved sessions; the counts are derived from those records. Lap times are driver-reported text, not measured. Reanalysis replaces the previous report. Delete permanently removes the recording, report and frames. Do not delete or reanalyze the same session concurrently from multiple tabs.

## Storage, privacy and deployment

Data is saved under ignored `.data/` on the server, outside public assets. Back up that directory to retain sessions. This is a **single-user local application**, not a multi-tenant hosted service. It binds to localhost by default. All routes, including media and frames, pass through access middleware. Non-local host access requires `JSR_PASSWORD`; use username `jsr`. Configure a strong password and HTTPS before any remote exposure. Everyone with that password shares all sessions. Local users of the same computer can access a passwordless local instance; set a password if that is unsuitable.

Video processing uses subprocess timeouts, bounded frame sizes and six frames per analysis. A maximum of two analyses can run in a single server process. Uploads are buffered in memory, so use short recordings and run only one upload at a time. There is no distributed job queue, per-user quota, account system, or malware scanning. Do not deploy this directly as a public upload service. Persistent disk and installed FFmpeg are needed; ephemeral/serverless hosting is not supported by this version.

Video frames may contain usernames or other personal information. Review footage before sending it to OpenAI, and consult OpenAI's API data policies. AI observations can be wrong. Sampled stills cannot reliably establish precise braking points, speeds, input angles, motion, or time gains. No telemetry measurements are inferred.

Cloud environments can alternatively bind a secure `JSR_AI_KEY` secret to `api.openai.com`; it is accepted as a server-only fallback because the platform reserves `OPENAI_` names. Never put a real key in saved scripts.

To repeat the HTTP smoke checks with the server running and no API key configured, run `node tests/http-smoke.mjs` (requires curl). It creates generated test footage, exercises uploads and deletion, and cleans up its test session. These are not real driving or AI-quality tests. MOV playback depends on the browser and the recording codec; use H.264 MP4 for widest compatibility.

## Scope and next steps

Milestone 1 implements upload, playback with HTTP range support, manual segment selection, FFmpeg extraction, structured OpenAI coaching, local persistence, history and deletion. Live model access requires your API key; a successful local build does not establish model output quality.

Milestone 2: session-specific chat, richer report history, broader integration tests and coaching evaluation. Milestone 3: CSV mapping, validated units, deterministic telemetry calculations, distance-aligned graphs and manual synchronization. Milestone 4: session comparison, practice goals, measured progress trends and an independent demonstration page. These features are **not implemented**. There are no fabricated sessions or placeholder AI reports.
