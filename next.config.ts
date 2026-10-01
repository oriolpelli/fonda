import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Keep a page the user has seen for 30 s in the client router cache, so
     * clicking back into it from the sidebar is instant instead of a skeleton
     * and a full server render. Next 15 changed this default from 30 s to 0
     * (node_modules/next/dist/docs/01-app/03-api-reference/05-config/
     * 01-next-config-js/staleTimes.md), and every dashboard page is dynamic, so
     * each revisit cost a round trip (docs/audits/2026-10-01-performance.md
     * §4.5). The browser's Back and Forward were always cached; this is for
     * link clicks.
     *
     * Never stale after an action: a Server Action that calls revalidatePath,
     * and every router.refresh(), clears this cache. The only data that can be
     * up to 30 s old is a background sync or email landing while you click
     * between pages — and every widget prints the time of the read it shows.
     */
    staleTimes: {
      dynamic: 30,
    },
  },
};

// Sentry runs via instrumentation.ts / instrumentation-client.ts (runtime init;
// the browser SDK loads when idle — lib/sentry-client.ts).
// We intentionally don't wrap with withSentryConfig — the build plugin (source-map
// upload, tunnel route) needs Sentry org/auth and adds build complexity. Add it
// later if you want uploaded source maps.
export default nextConfig;
