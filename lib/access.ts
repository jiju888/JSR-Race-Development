// Shared by middleware and the streaming endpoint, which deliberately bypasses it.
export function accessError(headers: Headers) {
  const password = process.env.JSR_PASSWORD;
  if (password) {
    let valid = false;
    try {
      const auth = headers.get("authorization");
      valid =
        !!auth?.startsWith("Basic ") &&
        atob(auth.slice(6)) === `jsr:${password}`;
    } catch {}
    if (!valid)
      return {
        status: 401,
        error: "Sign in with username jsr and your JSR_PASSWORD.",
        headers: { "WWW-Authenticate": 'Basic realm="JSR Race Intelligence"' },
      };
  } else {
    let hostname = "";
    try {
      hostname = new URL(`http://${headers.get("host") || ""}`).hostname;
    } catch {}
    if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname))
      return {
        status: 403,
        error: "Set JSR_PASSWORD before accessing JSR from another host.",
      };
  }
  return null;
}
