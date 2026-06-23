import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry runs via instrumentation.ts / instrumentation-client.ts (runtime init).
// We intentionally don't wrap with withSentryConfig — the build plugin (source-map
// upload, tunnel route) needs Sentry org/auth and adds build complexity. Add it
// later if you want uploaded source maps.
export default nextConfig;
