import { test } from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../lib/http";
import { accessError } from "../lib/access";
import { receiveUpload, UploadError } from "../lib/upload";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
test("same-origin uses browser Host, not the internal Next hostname", () => {
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("http://localhost:3000/api/upload", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  for (const origin of [
    "http://evil.example",
    "http://127.0.0.1:3001",
    "null",
    "https://127.0.0.1:3000",
  ])
    assert.throws(() =>
      sameOrigin(
        new Request("http://localhost:3000", {
          headers: { host: "127.0.0.1:3000", origin },
        }),
      ),
    );
  assert.throws(() =>
    sameOrigin(
      new Request("http://localhost:3000", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
    ),
  );
});
test("streaming endpoint shares host and password protection", () => {
  const previous = process.env.JSR_PASSWORD;
  try {
    delete process.env.JSR_PASSWORD;
    assert.equal(
      accessError(new Headers({ host: "evil.example" }))?.status,
      403,
    );
    assert.equal(accessError(new Headers({ host: "127.0.0.1:3000" })), null);
    process.env.JSR_PASSWORD = "test-only";
    assert.equal(
      accessError(new Headers({ host: "localhost:3000" }))?.status,
      401,
    );
    assert.equal(
      accessError(
        new Headers({
          host: "localhost:3000",
          authorization: "Basic " + btoa("jsr:test-only"),
        }),
      ),
      null,
    );
  } finally {
    if (previous === undefined) delete process.env.JSR_PASSWORD;
    else process.env.JSR_PASSWORD = previous;
  }
});
async function parse(
  body: string,
  contentType = "multipart/form-data; boundary=jsr",
) {
  const dir = await mkdtemp(path.join(tmpdir(), "jsr-parser-"));
  try {
    const req = Readable.from(
      (function* () {
        for (let i = 0; i < body.length; i += 7)
          yield Buffer.from(body.slice(i, i + 7));
      })(),
    ) as IncomingMessage;
    req.headers = { "content-type": contentType };
    const result = await receiveUpload(req, path.join(dir, "video"));
    return {
      ...result,
      content: await readFile(path.join(dir, "video"), "utf8"),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const field = (n: string, v: string) =>
  `--jsr\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
const file = (name = "clip.mp4") =>
  `--jsr\r\nContent-Disposition: form-data; name="video"; filename="${name}"\r\nContent-Type: video/mp4\r\n\r\nvideo bytes\r\n`;
const metadata =
  field("simulator", "Test") +
  field("track", "Test") +
  field("vehicle", "Test");
test("multipart parsing streams chunked bodies without content-length", async () => {
  const result = await parse(
    metadata +
      field("lapTime", "1:23.4") +
      field("comments", "Test comments") +
      file() +
      "--jsr--\r\n",
  );
  assert.equal(result.content, "video bytes");
  assert.equal(result.bytes, 11);
});
test("invalid multipart, duplicate fields, missing metadata and wrong extensions are rejected", async () => {
  for (const body of [
    metadata + file("clip.txt") + "--jsr--\r\n",
    metadata + field("track", "Duplicate") + file() + "--jsr--\r\n",
    file() + "--jsr--\r\n",
    metadata + file().slice(0, -3),
  ])
    await assert.rejects(() => parse(body));
  await assert.rejects(() => parse("{}", "application/json"), UploadError);
});
