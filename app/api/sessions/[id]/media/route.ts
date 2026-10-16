import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { directory } from "@/lib/store";
export async function GET(
  req: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    const name = new URL(req.url).searchParams.get("frame");
    if (name && !/^frame-[0-9a-f-]{36}-[0-5]\.jpg$/.test(name))
      return new Response(null, { status: 404 });
    const file = path.join(directory((await c.params).id), name || "video");
    const stat = await fs.stat(file);
    const headers: Record<string, string> = {
      "Content-Type": name ? "image/jpeg" : "video/mp4",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
    };
    let start = 0,
      end = stat.size - 1,
      status = 200;
    const range = req.headers.get("range");
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!m)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stat.size}` },
        });
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), end) : end;
      if (start > end || start >= stat.size)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stat.size}` },
        });
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers["Content-Length"] = String(end - start + 1);
    return new Response(
      Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream,
      { status, headers },
    );
  } catch {
    return new Response(null, { status: 404 });
  }
}
