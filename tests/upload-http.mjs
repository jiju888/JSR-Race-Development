// Production-server integration: curl streams real video files from disk.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const dir = await fs.mkdtemp(path.join(tmpdir(), "jsr-upload-http-"));
const base = "http://127.0.0.1:3107";
let logs = "";
const ids = [];
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3107",
  ],
  {
    env: {
      ...process.env,
      JSR_PASSWORD: "",
      OPENAI_API_KEY: "",
      JSR_AI_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (b) => (logs += b));
server.stderr.on("data", (b) => (logs += b));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function curl(args) {
  const out = path.join(dir, "response-" + Math.random());
  const child = spawn("curl", [
    "--silent",
    "--show-error",
    "--max-time",
    "90",
    "-o",
    out,
    "-w",
    "%{http_code}",
    ...args,
  ]);
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (b) => (stdout += b));
  child.stderr.on("data", (b) => (stderr += b));
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr)),
    );
  });
  return {
    status: Number(stdout),
    body: JSON.parse(await fs.readFile(out, "utf8")),
  };
}
function multipart(file, extra = []) {
  return [
    "-H",
    `Origin: ${base}`,
    "-F",
    `video=@${file}`,
    "-F",
    "simulator=Test",
    "-F",
    "track=Generated footage",
    "-F",
    "vehicle=Test car",
    "-F",
    "lapTime=1:23.4",
    "-F",
    "comments=Test",
    ...extra,
    base + "/api/upload",
  ];
}
async function padded(source, bytes, name) {
  const dest = path.join(dir, name);
  await fs.copyFile(source, dest);
  const stat = await fs.stat(dest);
  const handle = await fs.open(dest, "r+");
  const header = Buffer.alloc(8);
  header.writeUInt32BE(bytes - stat.size);
  header.write("free", 4);
  await handle.write(header, 0, 8, stat.size);
  await handle.truncate(bytes);
  await handle.close();
  return dest;
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      if ((await fetch(base + "/api/sessions")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(100);
  }
  assert.ok(ready, "server startup");
  const before = await (await fetch(base + "/api/sessions")).json();
  const directoriesBefore = await fs.readdir(".data");
  const small = path.join(dir, "small.mp4");
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
    small,
  ]);
  const mov = path.join(dir, "small.mov");
  execFileSync("ffmpeg", [
    "-nostdin",
    "-v",
    "error",
    "-i",
    small,
    "-c",
    "copy",
    mov,
  ]);
  for (const [file, size, chunked] of [
    [small, null, false],
    [mov, null, false],
    [
      await padded(small, 12 * 1024 * 1024, "large.mp4"),
      12 * 1024 * 1024,
      true,
    ],
    [
      await padded(small, 100 * 1024 * 1024, "maximum.mp4"),
      100 * 1024 * 1024,
      false,
    ],
    [
      await padded(mov, 100 * 1024 * 1024, "maximum.mov"),
      100 * 1024 * 1024,
      false,
    ],
  ]) {
    const result = await curl(
      multipart(file, chunked ? ["-H", "Transfer-Encoding: chunked"] : []),
    );
    assert.equal(result.status, 201, JSON.stringify(result.body));
    ids.push(result.body.id);
    if (size) assert.equal(result.body.bytes, size);
    assert.equal(result.body.duration, 3);
    const media = await fetch(`${base}/api/sessions/${result.body.id}/media`, {
      headers: { range: "bytes=0-99" },
    });
    assert.equal(media.status, 206);
    assert.equal((await media.arrayBuffer()).byteLength, 100);
  }
  const oversized = await padded(small, 100 * 1024 * 1024 + 1, "oversized.mp4");
  const over = await curl(
    multipart(oversized, ["-H", "Transfer-Encoding: chunked"]),
  );
  assert.equal(over.status, 413);
  assert.match(over.body.error, /100 MB/);
  const bad = path.join(dir, "bad.mp4");
  await fs.writeFile(bad, "not a video");
  assert.equal((await curl(multipart(bad))).status, 400);
  assert.equal(
    (await curl(multipart(small, ["-H", "Origin: http://evil.example"])))
      .status,
    403,
  );
  assert.equal(
    (await curl(multipart(small, ["-H", "Host: evil.example"]))).status,
    403,
  );
  assert.equal(
    (
      await curl([
        "-H",
        `Origin: ${base}`,
        "-H",
        "Content-Type: application/json",
        "--data",
        "{}",
        base + "/api/upload",
      ])
    ).status,
    400,
  );
  assert.equal(
    (
      await curl([
        "-H",
        `Origin: ${base}`,
        "--data-binary",
        "--broken",
        "-H",
        "Content-Type: multipart/form-data; boundary=x",
        base + "/api/upload",
      ])
    ).status,
    400,
  );
  const after = await (await fetch(base + "/api/sessions")).json();
  assert.equal(
    after.length,
    before.length + ids.length,
    "invalid uploads must not create sessions",
  );
  await delay(100);
  assert.deepEqual(
    (await fs.readdir(".data")).sort(),
    [...directoriesBefore, ...ids].sort(),
    "failed uploads must remove temporary directories",
  );
  execFileSync(process.execPath, ["tests/http-smoke.mjs"], {
    env: { ...process.env, JSR_TEST_BASE_URL: base },
    stdio: "inherit",
  });
  assert.doesNotMatch(logs, /Request body exceeded/);
  console.log(
    "PASS: MP4, MOV, chunked 12 MB, exact 100 MB, chunked oversized 413, corrupt video, cross-origin and host protection, malformed requests, range playback, persistence, and cleanup.",
  );
} finally {
  for (const id of ids)
    await fetch(`${base}/api/sessions/${id}`, {
      method: "DELETE",
      headers: { Origin: base },
    }).catch(() => {});
  server.kill("SIGTERM");
  await new Promise((resolve) =>
    server.exitCode !== null ? resolve() : server.once("exit", resolve),
  );
  await fs.rm(dir, { recursive: true, force: true });
}
