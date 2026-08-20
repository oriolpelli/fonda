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

      {/* Scrim: keeps the headline legible where it crosses the art.

          IT IS THE PAGE GROUND, NOT WHITE (v3, §12). It was white while the
          page was white, so it was invisible except as haze over the painting.
          On the grey ground that same white would paint a pale wash across the
          top of the hero and leave a visible horizontal seam at 88% where it
          releases into the section below — the scrim would read as a band of a
          different colour rather than as air. Mixing --fonda-bg down to
          transparent instead keeps the hero the same tone as the page all the
          way through, so only the art fades. color-mix rather than a second
          hard-coded hex, so the stops follow the token if the ground moves
          again.

          THE ALPHAS ARE UNCHANGED from the tuned white version — only the hue
          moved. They were set with the type in front of the art after it was
          centred and enlarged (§7 requires re-checking this whenever the art
          moves or is resized): coverage holds through ~76%, past the CTA row,
          and releases by 88% so the art's detailed lower edge stays unwashed.
          They are also deliberately stronger than the prototype's
          (.94/0 · .74/34% · .10/60% · 0/78%), because at 70vw the villa and
          pool sit directly behind the subhead and CTAs, which the prototype's
          near-zero coverage below 60% would leave on bare paint.

          Grey knocks the art back slightly harder than white did at the same
          alpha — the ground is nearer the painting's mid-tones — so this is
          the safe direction for legibility, not the risky one. Loosen these
          only with the type in front of you. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background: [
            "linear-gradient(180deg,",
            "color-mix(in srgb, var(--fonda-bg) 92%, transparent) 0%,",
            "color-mix(in srgb, var(--fonda-bg) 86%, transparent) 26%,",
            "color-mix(in srgb, var(--fonda-bg) 72%, transparent) 46%,",
            "color-mix(in srgb, var(--fonda-bg) 46%, transparent) 62%,",
            "color-mix(in srgb, var(--fonda-bg) 12%, transparent) 76%,",
            "color-mix(in srgb, var(--fonda-bg) 0%, transparent) 88%)",
          ].join(" "),
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
