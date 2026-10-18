import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { accessError } from "@/lib/access";
import { sameOrigin } from "@/lib/http";
import { directory, saveSession } from "@/lib/store";
import { receiveUpload, UploadError } from "@/lib/upload";
import { probe } from "@/lib/video";
// Native IncomingMessage is streamed by Busboy, never parsed by Next or middleware.
export const config = { api: { bodyParser: false, responseLimit: false } };
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers))
    if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value);
  const denied = accessError(headers);
  if (denied) {
    if (denied.headers)
      for (const [k, v] of Object.entries(denied.headers)) res.setHeader(k, v);
    res.status(denied.status).json({ error: denied.error });
    return;
  }
  try {
    sameOrigin(
      new Request(`http://${headers.get("host") || "localhost"}${req.url}`, {
        headers,
      }),
    );
  } catch {
    res.status(403).json({ error: "Cross-origin requests are not allowed." });
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Use POST to upload a video." });
    return;
  }
  const id = randomUUID();
  let saved = false;
  try {
    await fs.mkdir(directory(id), { recursive: true, mode: 0o700 });
    const file = path.join(directory(id), "video");
    const metadata = await receiveUpload(req, file);
    let duration: number;
    try {
      duration = await probe(file);
    } catch {
      throw new UploadError(
        "This video could not be read. Use a valid MP4 or MOV recording up to 30 minutes long. Check that FFmpeg and ffprobe are installed.",
      );
    }
    const session = {
      id,
      createdAt: new Date().toISOString(),
      ...metadata,
      duration,
    };
    await saveSession(session);
    saved = true;
    res.status(201).json(session);
  } catch (error) {
    const known = error instanceof UploadError;
    res
      .status(known ? error.status : 400)
      .json({
        error: known
          ? error.message
          : "The upload could not be completed. Check the video and try again.",
      });
  } finally {
    if (!saved) await fs.rm(directory(id), { recursive: true, force: true });
  }
}
