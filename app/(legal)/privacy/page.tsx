import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

// SCAFFOLD ONLY — this is placeholder structure, not legal advice. Replace the
// body with a policy reviewed by a qualified professional before launch.
export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}. This is a placeholder — replace
        with your reviewed policy.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Who we are</h2>
        <p className="text-muted-foreground">
          Fonda provides operations software to hotels. This policy explains what
          data we process and why.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Data we process</h2>
        <p className="text-muted-foreground">
          On behalf of connected hotels we process reservation and guest data from
          their property management system, and guest email when the hotel
          connects its inbox. We act as a data processor for this hotel data.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Sub-processors</h2>
        <p className="text-muted-foreground">
          We use Supabase (database/auth), Vercel (hosting), Anthropic (AI),
          Resend (email delivery), and the hotel&apos;s chosen PMS and mailbox
          providers. List and keep current before launch.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Your rights & contact</h2>
        <p className="text-muted-foreground">
          Describe data subject rights (access, deletion, etc.) and a contact
          address for privacy requests.
        </p>
      </section>
    </article>
  );
}
