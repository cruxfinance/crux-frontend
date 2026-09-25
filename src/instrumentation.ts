// Next.js calls this hook once per runtime on startup. @sentry/nextjs v8 no
// longer self-registers via next.config.js — the server/edge configs below
// are only picked up if something imports them from here.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
