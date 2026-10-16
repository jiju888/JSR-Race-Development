import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { segmentSchema, reportSchema } from "../lib/schema";
import { frameTimes, probe, extract } from "../lib/video";
import { directory } from "../lib/store";
test("segment validation rejects excessive, inverted and invalid ranges", () => {
  for (const s of [
    { name: "T1", start: 0, end: 31 },
    { name: "T1", start: 2, end: 1 },
    { name: "T1", start: -1, end: 3 },
    { name: "", start: 0, end: 3 },
  ])
    assert.equal(segmentSchema.safeParse(s).success, false);
  assert.equal(
    segmentSchema.safeParse({ name: "T1", start: 3, end: 12 }).success,
    true,
  );
});
test("sample timestamps remain inside the selected interval", () => {
  assert.deepEqual(frameTimes(6, 12), [6, 7, 8, 9, 10, 11]);
});
test("storage rejects traversal paths", () => {
  assert.throws(() => directory("../../etc"));
});
test("reports require a three-step plan", () => {
  assert.equal(
    reportSchema.safeParse({
      summary: "test",
      strengths: [],
      improvements: [],
      corners: [],
      nextSessionPlan: ["one"],
      limitations: [],
    }).success,
    false,
  );
});
test("real FFmpeg video probing and extraction", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "jsr-test-"));
  try {
    const video = path.join(dir, "test.mp4");
    execFileSync("ffmpeg", [
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=320x180:rate=10",
      "-t",
      "2",
      "-c:v",
      "mpeg4",
      video,
    ]);
    assert.ok((await probe(video)) >= 2);
    const frame = path.join(dir, "frame.jpg");
    await extract(video, frame, 1);
    assert.ok((await stat(frame)).size > 100);
    await assert.rejects(() => probe(path.join(dir, "missing.mp4")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
