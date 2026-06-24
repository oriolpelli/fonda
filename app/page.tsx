import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/features";

const INTEGRATIONS = ["MEWS", "Apaleo", "Gmail", "Outlook", "Booking.com", "SiteMinder"];

// Sana-style ROI stats: a context line on top, a big accent number, a label.
const STATS = [
  { top: "Daily admin, handled", value: "4–6h", label: "saved per GM, every day" },
  { top: "The morning catch-up", value: "90s", label: "briefing replaces an hour" },
  { top: "Set it up once", value: "1×", label: "then fully automated" },
  { top: "Onboarding cost", value: "€0", label: "your team starts the same day" },
];

// Morning-briefing preview rows (no emoji — a small accent square marks each).
const BRIEFING = [
  ["12 arrivals today.", " 3 haven't shared arrival times — chased automatically."],
  ["4 new OTA emails overnight.", " Drafts are ready for your review."],
  ["Occupancy tonight: 87%.", " Consider checking weekend pricing."],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/82 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
          <Wordmark />
          <nav className="flex items-center gap-6">
            <Link
              href="#features"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Features
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild variant="ink" size="sm">
              <Link href="/signup">Get early access</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>
              <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden>
                <circle cx="3" cy="3" r="3" fill="var(--fonda-accent)" />
              </svg>
              AI for boutique hotels · Private beta
            </Eyebrow>
            <h1 className="mt-6 text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-foreground">
              Your hotel,
              <br />
              running itself.
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-[19px] leading-[1.6] text-muted-foreground">
              An AI operations layer that handles the daily grind — morning
              briefings, OTA emails, check-in chasing, and live hotel data — in
              90 seconds.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="ink" size="lg">
                <Link href="/signup">Get early access</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">See how it works →</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-border px-6 py-5">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-2.5">
            <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
              Works with
            </span>
            {INTEGRATIONS.map((name) => (
              <span
                key={name}
                className="rounded-full border border-border px-3.5 py-1 text-[13px] font-medium text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-[1120px] scroll-mt-20 px-6 py-24 md:px-8"
        >
          <Eyebrow>What Fonda does</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-foreground">
            Five features. One calm morning.
          </h2>

          <div className="mt-14 grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-start">
            {/* Feature list */}
            <div className="flex flex-col gap-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.key}
                  className="rounded-[14px] border border-transparent px-5 py-4 transition-colors hover:border-border hover:bg-card"
                >
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                    {feature.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-[1.55] text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Briefing preview (app window) */}
            <div className="overflow-hidden rounded-[18px] border border-border bg-popover shadow-[0_12px_48px_rgba(10,10,10,0.06)] lg:sticky lg:top-24">
              <div className="flex items-center gap-1.5 border-b border-border bg-card px-4 py-3">
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-2 font-mono text-xs text-[var(--fonda-text-3)]">
                  Fonda · Morning Briefing
                </span>
              </div>
              <div className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-accent)]">
                  Tuesday, 24 June · 6:32 AM
                </p>
                <p className="mt-2.5 text-lg font-semibold leading-snug tracking-[-0.015em] text-foreground">
                  Good morning. Here&apos;s your hotel today.
                </p>
                <div className="mt-4 flex flex-col">
                  {BRIEFING.map(([strong, rest], i, arr) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 py-2.5 ${
                        i < arr.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="mt-[7px] size-[7px] shrink-0 rounded-[2px] bg-[var(--fonda-accent)]" />
                      <p className="text-[13px] leading-[1.55] text-muted-foreground">
                        <strong className="font-semibold text-foreground">
                          {strong}
                        </strong>
                        {rest}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ROI stats — Sana style */}
          <div className="mt-16">
            <div className="grid gap-8 border-t border-[var(--fonda-border-2)] pb-10 pt-12 md:grid-cols-2 md:items-end">
              <h2 className="max-w-[13ch] text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground">
                Quiet mornings, measurable hours.
              </h2>
              <p className="max-w-[42ch] text-[17px] leading-[1.6] text-muted-foreground">
                Fonda pays for itself in reclaimed time — here&apos;s what
                independent hotels get back once the daily busywork runs itself.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4">
              {STATS.map((stat, i) => (
                <div
                  key={stat.value}
                  className={`flex min-h-[200px] flex-col justify-between px-6 py-8 ${
                    i % 2 === 0 ? "border-r border-border" : ""
                  } ${i < STATS.length - 1 ? "md:border-r md:border-border" : "md:border-r-0"} ${
                    i < 2 ? "border-b border-border md:border-b-0" : ""
                  }`}
                >
                  <p className="text-sm leading-snug text-muted-foreground">
                    {stat.top}
                  </p>
                  <div>
                    <p className="text-[clamp(2.25rem,3.6vw,3.5rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--fonda-accent)]">
                      {stat.value}
                    </p>
                    <p className="mt-3 text-sm leading-snug text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-24 md:px-8">
          <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[28px] bg-ink px-6 py-24 text-center md:px-24">
            <Eyebrow>
              <span className="text-[color-mix(in_srgb,white_55%,transparent)]">
                Join the beta
              </span>
            </Eyebrow>
            <h2 className="mx-auto mt-5 max-w-xl text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--fonda-text-inv)]">
              Ready to get your mornings back?
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-[17px] leading-[1.6] text-[color-mix(in_srgb,white_65%,transparent)]">
              Free for the first 20 hotels. No credit card. Works the same day.
            </p>
            <div className="mt-9 flex justify-center">
              <Button asChild size="lg" className="bg-white text-ink hover:bg-white/90">
                <Link href="/signup">Get started →</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:px-8">
          <span>© {new Date().getFullYear()} Fonda. Hotel operations, on autopilot.</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
