import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { directory, sessions, saveSession } from "@/lib/store";
import { probe } from "@/lib/video";
import { failure, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(await sessions());
}
export async function POST(req: Request) {
  let id: string | undefined;
  try {
    sameOrigin(req);
    const length = Number(req.headers.get("content-length"));
    if (!length || length > 101 * 1024 * 1024)
      throw new Error("Upload limit is 100 MB.");
    const form = await req.formData();
    const file = form.get("video");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 100 * 1024 * 1024 ||
      !/\.(mp4|mov)$/i.test(file.name)
    )
      throw new Error("Choose an MP4 or MOV video, up to 100 MB.");
    const field = (key: string, required = true) => {
      const value = String(form.get(key) || "").trim();
      if ((required && !value) || value.length > 1000)
        throw new Error(`Check the ${key} field (maximum 1000 characters).`);
      return value;
    };
    const metadata = {
      simulator: field("simulator"),
      track: field("track"),
      vehicle: field("vehicle"),
      lapTime: field("lapTime", false),
      comments: field("comments", false),
    };
    id = randomUUID();
    await fs.mkdir(directory(id), { recursive: true, mode: 0o700 });
    const filePath = path.join(directory(id), "video");
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()), {
      mode: 0o600,
    });
    const duration = await probe(filePath);
    const session = {
      id,
      createdAt: new Date().toISOString(),
      ...metadata,
      duration,
      bytes: file.size,
    };
    await saveSession(session);
    return Response.json(session, { status: 201 });
  } catch (e) {
    if (id) await fs.rm(directory(id), { recursive: true, force: true });
    return failure(e);
  }
}
