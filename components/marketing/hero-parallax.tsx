"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { HeroIllustration } from "@/components/marketing/hero-illustration";

/**
 * Scroll-linked parallax hero — ported from design/hero-parallax-prototype.html.
 *
 * The illustration sits BEHIND the headline and drifts slower than the page;
 * the copy drifts very slightly the other way. Both are deliberate exceptions
 * to FONDA_DESIGN_IDENTITY.md §7 ("no parallax") and to the La Casa placement
 * rule ("never behind type") — see the v2.2 note in §7.
 *
 * Factors are the prototype's defaults folded together: its `data-parallax`
 * values multiplied by the default depth of 1.25.
 *   background   0.22  × 1.25 =  0.275
 *   foreground  -0.06  × 1.25 = -0.075
 * Headline lift + fade is OFF (the prototype's checkbox default), so the copy
 * never loses opacity — it only shifts a few pixels.
 *
 * REDUCED MOTION IS A HARD GATE. When the user prefers reduced motion we
 * attach no listeners and write no transforms, so the hero is a plain static
 * composition at full opacity. The transform is applied imperatively via refs
 * (never React state), so the server-rendered markup is already the static
 * version — there is no hydration mismatch and no first-paint jump for anyone.
 */

/** Background drift, as a fraction of scrollY. */
const BG_FACTOR = 0.275;
/** Foreground drift — opposite direction, much smaller. */
const FG_FACTOR = -0.075;

export function HeroParallax({ children }: { children: ReactNode }) {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let ticking = false;

    function paint() {
      const y = window.scrollY;
      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(0, ${y * BG_FACTOR}px, 0)`;
      }
      if (fgRef.current) {
        fgRef.current.style.transform = `translate3d(0, ${y * FG_FACTOR}px, 0)`;
      }
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      frame = requestAnimationFrame(paint);
    }

    function detach() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      ticking = false;
    }

    /** Re-evaluates the motion preference; also runs when the user flips it. */
    function sync() {
      detach();
      if (media.matches) {
        // Static composition: drop any transform we may have written before
        // the preference changed, and bind nothing.
        if (bgRef.current) bgRef.current.style.transform = "";
        if (fgRef.current) fgRef.current.style.transform = "";
        return;
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      // Prime the position: the page may already be scrolled on mount
      // (restored scroll, or an #anchor deep-link).
      paint();
    }

    sync();
    media.addEventListener("change", sync);
    return () => {
      detach();
      media.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div className="relative flex min-h-[min(96vh,1000px)] items-center justify-center overflow-hidden">
      {/* Background: the illustration, drifting slower than the page.
          Centred (not bottom-anchored as in the prototype) and lifted ~5% so
          its optical centre lines up with the copy's -6vh offset — the
          headline then runs straight through the middle of the painting.
          At the prototype's 70vw / 1400px the art nearly fills the hero, so
          centring and its flex-end + -2% land within a few dozen pixels of
          each other; centring holds up better at narrower viewports, where
          the art is much shorter than the hero. */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="absolute inset-0 z-[1] flex items-center justify-center will-change-transform"
      >
        <div className="w-[clamp(360px,70vw,1400px)] max-w-[90vw] -translate-y-[5%]">
          <HeroIllustration />
        </div>
      </div>

      {/* Scrim: keeps the headline legible where it crosses the art. White,
          matching --fonda-bg (the prototype's was warm, for its own ground).
          Re-tuned when the art was centred and enlarged — §7 requires
          re-checking this whenever the art moves or is resized. The type band
          now sits over the middle of the painting rather than above it, so
          coverage holds through ~76% (past the CTA row) instead of releasing
          at 60%, and the art's detailed lower edge stays unwashed.

          These stops are deliberately stronger than the prototype's
          (.94/0 · .74/34% · .10/60% · 0/78%). Two reasons: the prototype's
          ground is warm #FCFAF5, not our white, so its alphas were never
          portable; and at 70vw the villa and pool now sit directly behind the
          subhead and CTAs, which the prototype's near-zero coverage below 60%
          would leave on bare paint. Loosen these only with the type in front
          of you. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.86) 26%, rgba(255,255,255,0.72) 46%, rgba(255,255,255,0.46) 62%, rgba(255,255,255,0.12) 76%, rgba(255,255,255,0) 88%)",
        }}
      />

      {/* Foreground: the copy. Opacity is never touched — see the note above. */}
      <div
        ref={fgRef}
        className="relative z-[3] -mt-[6vh] w-full px-6 will-change-transform md:px-8"
      >
        {children}
      </div>
    </div>
  );
}
