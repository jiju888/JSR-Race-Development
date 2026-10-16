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
  if (origin && origin !== new URL(req.url).origin)
    throw new Error("Cross-origin requests are not allowed.");
}
