import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/features";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            For independent hotels, 20–200 rooms
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Hotel operations, on autopilot.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            Fonda gives your front desk a morning AI briefing, an email
            assistant, automatic check-in chasing, and answers to any question
            about your hotel.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.key} className="bg-background p-6">
                <h2 className="font-semibold tracking-tight">{feature.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Fonda. Hotel operations, on autopilot.
        </div>
      </footer>
    </div>
  );
}
