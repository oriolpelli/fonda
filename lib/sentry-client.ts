/**
 * Sentry in the browser, loaded after the page is up rather than before it.
 *
 * The client SDK was ~67 KB gzipped on every route — a quarter of the
 * JavaScript a signed-in page downloads and parses before it becomes
 * interactive (docs/audits/2026-10-01-performance.md §2, §4.9; measured in a
 * production build: Home 268 KB → 218 KB with this, ~200 KB with the error
 * boundaries below also going through it).
 *
 * Now the SDK is its own chunk: instrumentation-client.ts asks for it when the
 * browser is idle, and the error boundaries ask for it when they have
 * something to report — whichever comes first loads and initialises it, once.
 *
 * The trade, stated: a browser-side error thrown before the idle callback fires
 * (roughly the first second) is not reported. Server errors are unaffected —
 * `onRequestError` in instrumentation.ts captures those on the server — and an
 * error that reaches an error boundary is still reported, late but whole.
 *
 * Options are unchanged: disabled without NEXT_PUBLIC_SENTRY_DSN, no tracing,
 * no PII (guest data must not leave the app).
 */

type SentryModule = typeof import("@sentry/nextjs");

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let loading: Promise<SentryModule> | null = null;

/** Loads and initialises the SDK, once. Null when no DSN is configured. */
export function loadSentry(): Promise<SentryModule> | null {
  if (!dsn) return null;
  loading ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      enabled: true,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    return Sentry;
  });
  return loading;
}

/** Reports an error from the browser — loading the SDK first if need be. */
export function captureClientException(error: unknown): void {
  void loadSentry()
    ?.then((Sentry) => Sentry.captureException(error))
    // Reporting must never become the failure: a blocked or offline chunk
    // load is dropped silently.
    .catch(() => {});
}
