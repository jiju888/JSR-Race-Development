export function failure(error: unknown, status = 400) {
  console.error(error instanceof Error ? error.message : "Request failed");
  return Response.json(
    {
      error:
        error instanceof Error && !("status" in error)
          ? error.message
          : "The AI service could not complete this request. Check your API access and try again.",
    },
    { status },
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  // Host is the browser-facing authority. Next's internal URL can use localhost
  // even when the browser requested 127.0.0.1. Never trust forwarded host headers.
  const expected = new URL(req.url);
  expected.host = req.headers.get("host") || expected.host;
  if ((origin && origin !== expected.origin) || site === "cross-site")
    throw new Error("Cross-origin requests are not allowed.");
}
