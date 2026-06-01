import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  tracesSampleRate: 0,
  debug: false,
});
