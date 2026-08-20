"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors in the root layout itself. Must render its own <html>/<body>.
//
// The one page in the app that can't use the design tokens: it replaces the root
// layout, so globals.css may never have loaded and `var(--fonda-*)` would
// resolve to nothing — leaving black-on-white system defaults. The hexes below
// are therefore copied literally from FONDA_SANA_REDESIGN.md §3.1 (v3), not from
// v2 "Signal": neutral grey ground, warm near-black ink. Keep them in step with
// globals.css by hand; nothing enforces it.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#eeeeee", // --fonda-bg
          color: "#1c1a16", // --fonda-text
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#56534b" }}>
            Please refresh the page. If it keeps happening, contact support.
          </p>
        </div>
      </body>
    </html>
  );
}
