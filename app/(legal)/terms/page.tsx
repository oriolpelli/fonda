import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

// SCAFFOLD ONLY — placeholder structure, not legal advice. Replace with terms
// reviewed by a qualified professional before launch.
export default function TermsPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}. This is a placeholder — replace
        with your reviewed terms.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">The service</h2>
        <p className="text-muted-foreground">
          Fonda provides AI-assisted operations tooling for hotels, including
          morning briefings, email drafting, check-in chasing, and natural-language
          queries over the hotel&apos;s own data.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Acceptable use</h2>
        <p className="text-muted-foreground">
          The hotel is responsible for reviewing AI-generated drafts before they
          are sent to guests. Describe acceptable use and account responsibilities.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Subscription & billing</h2>
        <p className="text-muted-foreground">
          Describe pricing, billing cycle, cancellation, and refunds.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Liability & contact</h2>
        <p className="text-muted-foreground">
          Include limitation of liability, warranty disclaimers, governing law,
          and a contact address.
        </p>
      </section>
    </article>
  );
}
