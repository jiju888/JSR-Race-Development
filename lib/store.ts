import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Session } from "./schema";
export const root = path.join(process.cwd(), ".data");
export function directory(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Session not found.");
  return path.join(root, id);
}
export async function readSession(id: string): Promise<Session> {
  return JSON.parse(
    await fs.readFile(path.join(directory(id), "session.json"), "utf8"),
  );
}
export async function saveSession(s: Session) {
  const dir = directory(s.id);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = path.join(dir, randomUUID() + ".tmp");
  await fs.writeFile(temp, JSON.stringify(s), { mode: 0o600 });
  await fs.rename(temp, path.join(dir, "session.json"));
}
export async function sessions(): Promise<Session[]> {
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const dirs = await fs.readdir(root);
  const all = await Promise.all(
    dirs
      .filter((d) => /^[0-9a-f-]{36}$/.test(d))
      .map((d) => readSession(d).catch(() => null)),
  );
  return all
    .filter((s): s is Session => s !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
