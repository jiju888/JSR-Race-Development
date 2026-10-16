import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const password = process.env.JSR_PASSWORD;
  if (password) {
    const auth = req.headers.get("authorization");
    let valid = false;
    try {
      valid =
        !!auth?.startsWith("Basic ") &&
        atob(auth.slice(6)) === `jsr:${password}`;
    } catch {}
    if (!valid)
      return new NextResponse(
        "Sign in with username jsr and your JSR_PASSWORD.",
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="JSR Race Intelligence"',
          },
        },
      );
  } else {
    const host = req.headers.get("host")?.split(":")[0];
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]")
      return new NextResponse(
        "Set JSR_PASSWORD before accessing JSR from another host.",
        { status: 403 },
      );
  }
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
