import * as Sentry from "@sentry/nextjs";

// Server-side Sentry init. Disabled until SENTRY_DSN is set (the DSN is yours to
// provide — see .env.example). PII off: guest data must not leave the app.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
