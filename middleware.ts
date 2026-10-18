import { NextRequest, NextResponse } from "next/server";
import { accessError } from "./lib/access";
export function middleware(req: NextRequest) {
  const error = accessError(req.headers);
  if (error)
    return new NextResponse(error.error, {
      status: error.status,
      headers: error.headers,
    });
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
// Uploads must not enter middleware: Next clones/buffers middleware request bodies.
// /api/upload applies the same access checks inside its native Node handler.
export const config = {
  matcher: ["/((?!api/upload(?:/|$)|_next/static|_next/image|favicon.ico).*)"],
};
