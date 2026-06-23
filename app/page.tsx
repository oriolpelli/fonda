import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { CoffeeCup, HotelKey } from "@/components/illustrations";
import { FEATURES } from "@/lib/features";

const INTEGRATIONS = ["MEWS", "Apaleo", "Gmail", "Outlook"];

const STATS = [
  { value: "4–6h", label: "Daily admin\nsaved per GM" },
  { value: "90s", label: "Morning briefing\nreplaces an hour" },
  { value: "1×", label: "Setup, then\nfully automated" },
  { value: "€0", label: "Training required\nto get started" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fonda-text-3)]">
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--fonda-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-12">
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
        <section className="relative overflow-hidden px-6 py-24 md:px-12 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>
              <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden>
                <circle cx="3" cy="3" r="3" fill="var(--fonda-accent)" />
              </svg>
              AI for boutique hotels · Private beta
            </Eyebrow>
            <h1 className="mt-6 font-serif text-[clamp(2.75rem,7vw,5.5rem)] font-normal leading-[1.05] tracking-[-0.025em] text-foreground">
              Your hotel,
              <br />
              <em className="italic">running itself.</em>
            </h1>
            <p className="mt-5 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] italic leading-snug text-[var(--fonda-text-3)]">
              The intelligence only chains could afford — until now.
            </p>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.75] text-muted-foreground">
              Fonda gives independent hotels an AI operations layer that handles
              the daily grind — morning briefings, OTA emails, check-in chasing,
              and live hotel data — in 90 seconds.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="ink" size="lg">
                <Link href="/signup">Get early access</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="#features">See how it works →</Link>
              </Button>
            </div>
          </div>
          <CoffeeCup className="pointer-events-none absolute bottom-10 right-10 hidden w-[150px] opacity-80 lg:block" />
        </section>

        {/* Trust bar */}
        <section className="border-y border-border px-6 py-5">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--fonda-text-3)]">
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
          className="mx-auto max-w-[1120px] scroll-mt-20 px-6 py-24 md:px-12"
        >
          <Eyebrow>What Fonda does</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-serif text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
            Five features.{" "}
            <em className="italic">One calm morning.</em>
          </h2>

          <div className="mt-14 grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-start">
            {/* Feature list */}
            <div className="flex flex-col gap-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.key}
                  className="rounded-2xl border border-transparent px-5 py-4 transition-colors hover:border-border hover:bg-card"
                >
                  <h3 className="font-serif text-xl font-normal text-foreground">
                    {feature.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-[1.6] text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Briefing preview (app window) */}
            <div className="overflow-hidden rounded-[20px] border border-border bg-popover shadow-[0_8px_40px_rgba(28,25,21,0.06)] lg:sticky lg:top-24">
              <div className="flex items-center gap-1.5 border-b border-border bg-card px-4 py-3">
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-2 text-xs text-[var(--fonda-text-3)]">
                  Fonda · Morning Briefing
                </span>
              </div>
              <div className="p-6">
                <p className="text-[10px] uppercase tracking-[0.1em] text-primary">
                  Tuesday, 23 June · 6:32 AM
                </p>
                <p className="mt-2 font-serif text-lg leading-snug text-foreground">
                  Good morning. <em className="italic">Here&apos;s your hotel today.</em>
                </p>
                <div className="mt-4 flex flex-col">
                  {[
                    ["🛎️", "12 arrivals", " today. 3 guests haven't shared arrival times — followed up automatically."],
                    ["📬", "4 new OTA emails", " overnight. Drafts ready for your review."],
                    ["📈", "Occupancy tonight: 87%.", " Consider checking weekend pricing."],
                  ].map(([icon, strong, rest], i, arr) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 py-2.5 ${
                        i < arr.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="text-[15px] leading-none">{icon}</span>
                      <p className="text-[13px] leading-[1.55] text-muted-foreground">
                        <strong className="font-medium text-foreground">
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

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 overflow-hidden rounded-[20px] border border-border md:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.value}
                className={`p-8 ${
                  i < STATS.length - 1 ? "md:border-r md:border-border" : ""
                } ${i % 2 === 0 ? "border-r border-border md:border-r" : ""} ${
                  i < 2 ? "border-b border-border md:border-b-0" : ""
                }`}
              >
                <div className="font-serif text-5xl font-normal leading-none tracking-[-0.03em] text-foreground">
                  {stat.value}
                </div>
                <div className="mt-2 whitespace-pre-line text-sm leading-tight text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-24 md:px-12">
          <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[28px] border border-border bg-card px-6 py-24 text-center md:px-24">
            <div className="relative z-10">
              <Eyebrow>Join the beta</Eyebrow>
              <h2 className="mx-auto mt-5 max-w-xl font-serif text-[clamp(2rem,4vw,3.5rem)] font-normal leading-[1.08] tracking-[-0.02em] text-foreground">
                Ready to get your
                <br />
                <em className="italic">mornings back?</em>
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-[17px] leading-[1.75] text-muted-foreground">
                Free for the first 20 hotels. No credit card. Works the same day.
              </p>
              <div className="mt-9 flex justify-center">
                <Button asChild variant="ink" size="lg">
                  <Link href="/signup">Get started →</Link>
                </Button>
              </div>
            </div>
            <HotelKey className="pointer-events-none absolute -bottom-2 right-6 w-[200px] opacity-20" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:px-12">
          <span>
            © {new Date().getFullYear()} Fonda. Hotel operations, on autopilot.
          </span>
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
