import Busboy from "busboy";
import type { IncomingMessage } from "node:http";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import {
  MAX_VIDEO_BYTES,
  MAX_MULTIPART_BYTES,
  UPLOAD_LIMIT_MESSAGE,
} from "./upload-limits";
export class UploadError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function receiveUpload(req: IncomingMessage, destination: string) {
  const length = req.headers["content-length"];
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_MULTIPART_BYTES))
    throw new UploadError(UPLOAD_LIMIT_MESSAGE, 413);
  let parser: ReturnType<typeof Busboy>;
  try {
    parser = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fields: 5,
        // Busboy emits partsLimit when the count reaches the limit.
        // Allow six valid parts (one video plus five metadata fields).
        parts: 7,
        fileSize: MAX_VIDEO_BYTES + 1,
        fieldSize: 4000,
        fieldNameSize: 80,
      },
    });
  } catch {
    throw new UploadError(
      "Send a multipart/form-data upload with a video file.",
    );
  }
  const fields: Record<string, string> = {};
  let issue: Error | undefined,
    bytes = 0,
    total = 0,
    files = 0;
  const writes: Promise<void>[] = [];
  parser.on("field", (name, value, info) => {
    if (
      !["simulator", "track", "vehicle", "lapTime", "comments"].includes(
        name,
      ) ||
      Object.hasOwn(fields, name) ||
      info.valueTruncated ||
      info.nameTruncated ||
      value.trim().length > 1000
    )
      issue ||= new UploadError(
        "Invalid or duplicate session metadata (maximum 1000 characters per field).",
      );
    fields[name] = value.trim();
  });
  parser.on("file", (name, file, info) => {
    files++;
    if (name !== "video" || !/\.(mp4|mov)$/i.test(info.filename || "")) {
      issue ||= new UploadError(UPLOAD_LIMIT_MESSAGE);
      file.resume();
      return;
    }
    file.on("limit", () => {
      issue = new UploadError(UPLOAD_LIMIT_MESSAGE, 413);
    });
    const counter = new Transform({
      transform(chunk, _, cb) {
        bytes += chunk.length;
        if (bytes > MAX_VIDEO_BYTES)
          issue = new UploadError(UPLOAD_LIMIT_MESSAGE, 413);
        cb(null, chunk);
      },
    });
    const write = pipeline(
      file,
      counter,
      createWriteStream(destination, { flags: "wx", mode: 0o600 }),
    );
    // Attach a rejection handler immediately, even while the multipart parser runs.
    writes.push(
      write.catch((error) => {
        issue ||= error;
        parser.destroy(error);
      }),
    );
  });
  for (const event of ["filesLimit", "fieldsLimit", "partsLimit"])
    parser.on(event, () => {
      issue ||= new UploadError(
        "Upload exactly one video and only the session metadata fields.",
      );
    });
  const count = (chunk: Buffer) => {
    total += chunk.length;
    if (total > MAX_MULTIPART_BYTES) {
      issue = new UploadError(UPLOAD_LIMIT_MESSAGE, 413);
      req.unpipe(parser);
      parser.destroy(issue);
      req.resume();
    }
  };
  const aborted = () =>
    parser.destroy(new UploadError("Upload interrupted. Please try again."));
  req.on("data", count);
  req.on("aborted", aborted);
  req.on("error", aborted);
  try {
    await new Promise<void>((resolve, reject) => {
      parser.once("close", resolve);
      parser.once("error", reject);
      req.pipe(parser);
    });
  } catch (error) {
    issue ||=
      error instanceof Error
        ? error
        : new UploadError("Malformed multipart upload.");
  } finally {
    req.unpipe(parser);
    req.removeListener("data", count);
    req.removeListener("aborted", aborted);
    req.removeListener("error", aborted);
    if (!req.complete) req.resume();
    await Promise.all(writes);
  }
  if (issue) throw issue;
  if (files !== 1 || bytes === 0)
    throw new UploadError("Choose one non-empty MP4 or MOV video.");
  for (const field of ["simulator", "track", "vehicle"])
    if (!fields[field]) throw new UploadError(`Enter the ${field} field.`);
  return {
    bytes,
    simulator: fields.simulator,
    track: fields.track,
    vehicle: fields.vehicle,
    lapTime: fields.lapTime || "",
    comments: fields.comments || "",
  };
}
