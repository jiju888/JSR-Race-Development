import { promises as fs } from "node:fs";
import { directory, readSession } from "@/lib/store";
import { failure, sameOrigin } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: Context) {
  try {
    return Response.json(await readSession((await c.params).id));
  } catch {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
}
export async function DELETE(req: Request, c: Context) {
  try {
    sameOrigin(req);
    await fs.rm(directory((await c.params).id), {
      recursive: true,
      force: true,
    });
    return Response.json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
