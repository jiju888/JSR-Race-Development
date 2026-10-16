// Run against npm start, without OPENAI_API_KEY, on an empty local workspace.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const base = "http://127.0.0.1:3000";
const dir = await mkdtemp(path.join(tmpdir(), "jsr-http-"));
let id;
try {
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Find your edge/);
  const blocked = execFileSync(
    "curl",
    [
      "-s",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-H",
      "Host: untrusted.example",
      base,
    ],
    { encoding: "utf8" },
  );
  assert.equal(blocked, "403");
  const cross = await fetch(base + "/api/sessions", {
    method: "POST",
    headers: { origin: "https://other.example" },
  });
  assert.equal(cross.status, 400);
  const file = path.join(dir, "test.mp4");
  execFileSync("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x180:rate=10",
    "-t",
    "3",
    "-c:v",
    "mpeg4",
    file,
  ]);
  const data = new FormData();
  data.set(
    "video",
    new Blob([await readFile(file)], { type: "video/mp4" }),
    "test.mp4",
  );
  data.set("simulator", "Test simulator");
  data.set("track", "Generated test footage");
  data.set("vehicle", "Test car");
  const uploaded = await fetch(base + "/api/sessions", {
    method: "POST",
    body: data,
  });
  assert.equal(uploaded.status, 201);
  const s = await uploaded.json();
  id = s.id;
  assert.equal(s.duration, 3);
  const list = await (await fetch(base + "/api/sessions")).json();
  assert.ok(list.some((x) => x.id === id));
  const media = await fetch(`${base}/api/sessions/${id}/media`, {
    headers: { range: "bytes=0-99" },
  });
  assert.equal(media.status, 206);
  assert.equal((await media.arrayBuffer()).byteLength, 100);
  const invalidRange = await fetch(`${base}/api/sessions/${id}/media`, {
    headers: { range: "bytes=999999999-" },
  });
  assert.equal(invalidRange.status, 416);
  const missingKey = await fetch(`${base}/api/sessions/${id}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "T1", start: 0, end: 2 }),
  });
  assert.equal(missingKey.status, 503);
  assert.match((await missingKey.json()).error, /OPENAI_API_KEY/);
  const bad = new FormData();
  bad.set("video", new Blob(["not a video"]), "invalid.mp4");
  bad.set("simulator", "Test");
  bad.set("track", "Test");
  bad.set("vehicle", "Test");
  assert.equal(
    (await fetch(base + "/api/sessions", { method: "POST", body: bad })).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/api/sessions/${id}`, { method: "DELETE" })).status,
    200,
  );
  assert.equal((await fetch(`${base}/api/sessions/${id}/media`)).status, 404);
  assert.equal((await fetch(`${base}/api/sessions/${id}`)).status, 404);
  id = undefined;
  console.log(
    "PASS: dashboard, host access, cross-origin rejection, upload, persistence, range playback, invalid range, missing AI key, invalid video and deletion.",
  );
} finally {
  if (id) await fetch(`${base}/api/sessions/${id}`, { method: "DELETE" });
  await rm(dir, { recursive: true, force: true });
}
