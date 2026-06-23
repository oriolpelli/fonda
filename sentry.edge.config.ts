import * as Sentry from "@sentry/nextjs";

// Edge runtime Sentry init (Proxy, edge routes). Disabled until SENTRY_DSN set.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
