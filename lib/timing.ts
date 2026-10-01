import "server-only";

/**
 * Opt-in timings for the reads behind every signed-in page
 * (docs/audits/2026-10-01-performance.md, prompt M1).
 *
 * Off unless `PERF_LOG=1`. Set it on a Preview deployment only (Vercel →
 * Settings → Environment Variables → Preview), load a page, and the function
 * log gets one line per read:
 *
 *     [perf] home.snapshot 182ms
 *
 * which is what the speed work is measured against, before and after each step.
 *
 * LABELS ARE STATIC STRINGS, written here in code: a surface and a read, never
 * an id, a name, an address or a hotel id. Nothing about a guest or a hotel may
 * reach a log line (CLAUDE.md), and a label built from data would be the way
 * one did.
 *
 * The clock starts when the promise is handed in, which is when the work was
 * started, so wrap at the call site: `timed("home.inbox", loadInbox())`.
 */

const enabled = process.env.PERF_LOG === "1";

export function timed<T>(label: string, work: Promise<T>): Promise<T> {
  if (!enabled) return work;
  const start = performance.now();
  const log = () =>
    console.log(`[perf] ${label} ${Math.round(performance.now() - start)}ms`);
  return work.then(
    (value) => {
      log();
      return value;
    },
    (error: unknown) => {
      log();
      throw error;
    }
  );
}

/**
 * Logs the time since `start` (a `performance.now()` reading) under `label`.
 * For spans that aren't one promise — Ask's time to first token, say.
 */
export function logSince(label: string, start: number): void {
  if (!enabled) return;
  console.log(`[perf] ${label} ${Math.round(performance.now() - start)}ms`);
}
