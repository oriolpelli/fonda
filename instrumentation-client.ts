import { loadSentry } from "@/lib/sentry-client";

// Client-side Sentry, initialised once the browser is idle instead of before
// the app becomes interactive — see lib/sentry-client.ts for the measured cost
// it saves and the one trade it makes. Disabled until NEXT_PUBLIC_SENTRY_DSN
// is set, exactly as before.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const start = () => void loadSentry();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 4000 });
  } else {
    setTimeout(start, 2000);
  }
}
