import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { COMPANY, LEGAL_LAST_UPDATED } from "@/app/[lang]/(legal)/company";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.legal.termsTitle };
}

// English body kept in plain JS (see Privacy page for rationale).
// ⚠️ Reviewed starting point — not legal advice. Have a qualified lawyer check
// this and fill in the placeholders in ../company.ts before you charge.

type Section = { heading: string; paragraphs: string[]; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    heading: "1. Who we are and these terms",
    paragraphs: [
      `These Terms of Service ("Terms") govern your use of ${COMPANY.brand}, provided by ${COMPANY.legalName} (${COMPANY.taxId}), with registered office at ${COMPANY.address} ("we", "us"). By creating an account or using the service, you agree to these Terms. If you are agreeing on behalf of a hotel or company, you confirm you are authorised to bind it.`,
    ],
  },
  {
    heading: "2. The service",
    paragraphs: [
      "Fonda is AI-assisted operations software for hotels. It connects to a hotel's property management system (MEWS or Apaleo) and, optionally, its Gmail inbox, to provide a morning operations briefing, email classification and draft replies, check-in-time chasing, and natural-language answers about the hotel's own data. Features may evolve over time.",
    ],
  },
  {
    heading: "3. Accounts and eligibility",
    paragraphs: [
      "You must provide accurate account information and keep your credentials secure. You are responsible for activity under your account. The service is intended for business use by hotels and their staff, not for consumers.",
    ],
  },
  {
    heading: "4. Your data and connected accounts",
    paragraphs: [
      "As between you and us, you (the hotel) are the controller of the reservation, guest, and mailbox data processed through Fonda, and we act as your processor under our Data Processing Agreement and Privacy Policy. You confirm that you have the authority and any necessary legal basis or guest consent to connect your PMS and mailbox and to have us process that data on your behalf. You are responsible for the accuracy of the data in your connected systems.",
    ],
  },
  {
    heading: "5. AI-generated content — your responsibility to review",
    paragraphs: [
      "Fonda uses automated systems to generate briefings, drafts, and answers. This output may occasionally be incomplete or inaccurate. It is provided to assist you, not to replace your judgement.",
      "You are responsible for reviewing all AI-generated drafts and outputs before acting on them or sending them to guests. We are not liable for content you choose to send. Do not rely on Fonda for decisions that require professional, legal, or financial advice.",
    ],
  },
  {
    heading: "6. Acceptable use",
    paragraphs: ["You agree not to:"],
    bullets: [
      "use the service unlawfully, or to process data you have no right to process;",
      "attempt to access other customers' data or circumvent security or tenancy controls;",
      "reverse engineer, resell, or overload the service, or use it to build a competing product;",
      "use the service to send spam or unsolicited messages to guests.",
    ],
  },
  {
    heading: "7. Subscription and billing",
    paragraphs: [
      `Paid plans are billed in advance on a recurring basis. The standard price is ${COMPANY.price}, unless otherwise agreed in writing (for example, during a free pilot). Fees are exclusive of any applicable taxes (including VAT/IVA), which will be added where required.`,
      "You may cancel at any time; cancellation takes effect at the end of the current billing period, and fees already paid are non-refundable except where required by law. We may change pricing on reasonable prior notice, effective at your next renewal.",
    ],
  },
  {
    heading: "8. Third-party services",
    paragraphs: [
      "Fonda relies on third-party services (including your PMS, Google, and our infrastructure and AI providers). Your use of those services is subject to their own terms, and we are not responsible for their availability or acts.",
    ],
  },
  {
    heading: "9. Intellectual property",
    paragraphs: [
      "We retain all rights in the Fonda software and brand. You retain all rights in your hotel and guest data. You grant us the limited rights needed to process that data to provide the service.",
    ],
  },
  {
    heading: "10. Warranties and disclaimers",
    paragraphs: [
      "The service is provided on an \"as is\" and \"as available\" basis. To the maximum extent permitted by law, we disclaim all implied warranties, including fitness for a particular purpose and uninterrupted or error-free operation. Nothing in these Terms excludes liability that cannot be excluded under applicable law.",
    ],
  },
  {
    heading: "11. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, we will not be liable for indirect, incidental, or consequential damages, or for lost profits, revenue, or data. Our total aggregate liability arising out of or relating to the service is limited to the amounts you paid us for the service in the twelve months before the event giving rise to the claim. This does not limit liability for fraud, wilful misconduct, or anything else that cannot be limited by law.",
    ],
  },
  {
    heading: "12. Term and termination",
    paragraphs: [
      "Either party may terminate on notice as described in these Terms or any order. We may suspend or terminate access for breach of these Terms or to protect the service or other customers. On termination, your right to use the service ends and, on request, we will delete or return your data as set out in the Data Processing Agreement and Privacy Policy.",
    ],
  },
  {
    heading: "13. Governing law and jurisdiction",
    paragraphs: [
      `These Terms are governed by the laws of ${COMPANY.governingLawCountry}. The courts of ${COMPANY.courtsCity} will have exclusive jurisdiction, without prejudice to any mandatory consumer or statutory protections that may apply.`,
    ],
  },
  {
    heading: "14. Changes",
    paragraphs: [
      "We may update these Terms from time to time. Material changes will be notified through the service or by email and take effect as stated in the notice. Continued use after changes take effect constitutes acceptance.",
    ],
  },
];

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {dict.legal.termsTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {dict.legal.englishNotice}
        </p>
        <p className="text-sm text-muted-foreground">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="text-muted-foreground">
              {p}
            </p>
          ))}
          {s.bullets ? (
            <ul className="flex flex-col gap-1.5 pl-1">
              {s.bullets.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-muted-foreground">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-[2px] bg-[var(--fonda-accent)]"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <p className="text-sm text-muted-foreground">
        Contact: {COMPANY.contactEmail}
      </p>
    </article>
  );
}
