import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export async function probe(file: string) {
  const { stdout } = await exec(
    "ffprobe",
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-show_entries",
      "format=duration:stream=codec_type",
      "-of",
      "json",
      file,
    ],
    { timeout: 20000, maxBuffer: 1024 * 1024 },
  );
  const data = JSON.parse(stdout);
  const duration = Number(data.format?.duration);
  if (
    !data.streams?.some(
      (s: { codec_type: string }) => s.codec_type === "video",
    ) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 1800
  )
    throw new Error("Upload a valid video up to 30 minutes long.");
  return duration;
}
export async function extract(file: string, output: string, time: number) {
  await exec(
    "ffmpeg",
    [
      "-nostdin",
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-ss",
      String(time),
      "-i",
      file,
      "-frames:v",
      "1",
      "-vf",
      "scale=960:540:force_original_aspect_ratio=decrease",
      "-q:v",
      "3",
      "-y",
      output,
    ],
    { timeout: 30000, maxBuffer: 1024 * 1024 },
  );
}
export function frameTimes(start: number, end: number) {
  return Array.from({ length: 6 }, (_, i) => start + ((end - start) * i) / 6);
}
