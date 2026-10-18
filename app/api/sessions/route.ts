import { sessions } from "@/lib/store";
import { sameOrigin, failure } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(await sessions());
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
  } catch (error) {
    return failure(error, 403);
  }
  return Response.json(
    { error: "Use /api/upload for streaming video uploads." },
    { status: 405, headers: { Allow: "GET" } },
  );
}
