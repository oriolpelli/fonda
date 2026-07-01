import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { COMPANY, LEGAL_LAST_UPDATED } from "@/app/[lang]/(legal)/company";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.legal.privacyTitle };
}

// The substantive body is intentionally kept in English (legal text must be
// professionally translated); only the title + notice are localized. Content
// lives in plain JS below so apostrophes/quotes need no JSX escaping and the
// text is easy to review and edit.
//
// ⚠️ Reviewed starting point — not legal advice. Have a qualified lawyer check
// this and fill in the placeholders in ../company.ts before launch.

type Section = { heading: string; paragraphs: string[]; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    heading: "Who we are",
    paragraphs: [
      `${COMPANY.legalName} ("${COMPANY.brand}", "we", "us") provides operations software to hotels. Our registered office is ${COMPANY.address} (${COMPANY.taxId}).`,
      `This policy explains what personal data we process, why, on what legal basis, and the rights you have under the EU General Data Protection Regulation (GDPR) and Spanish data-protection law. For any privacy question or request, contact us at ${COMPANY.privacyEmail}.`,
    ],
  },
  {
    heading: "Two roles: controller and processor",
    paragraphs: [
      "We handle personal data in two distinct roles, and it matters which applies:",
    ],
    bullets: [
      "Controller — for data about our direct customers: the hotel staff who create accounts and use Fonda (name, work email, login credentials, settings, and usage/diagnostic data). We decide how this data is used.",
      "Processor — for the hotel operational data we handle on a hotel's behalf: reservations, guest profiles, and mailbox contents pulled from the systems a hotel connects. The hotel is the controller of that data; we only process it to provide the service under the hotel's instructions and our Data Processing Agreement.",
    ],
  },
  {
    heading: "Data we process",
    paragraphs: ["Depending on your relationship with us, this may include:"],
    bullets: [
      "Account data: name, work email address, password (stored hashed by our auth provider), hotel name, room count, timezone, language, and product settings.",
      "Hotel/PMS data (as processor): reservation records, arrival/departure and occupancy data, and guest profile fields retrieved from the hotel's property management system (MEWS or Apaleo) via official read APIs.",
      "Mailbox data (as processor): when a hotel connects Gmail, the content and metadata of guest emails needed to classify messages and draft replies.",
      "Connection credentials: OAuth tokens and API keys for connected PMS and mailbox accounts, encrypted at rest.",
      "Technical data: log, device, and error-diagnostic data used to keep the service secure and reliable.",
    ],
  },
  {
    heading: "How and why we use data (legal bases)",
    paragraphs: [
      "We use account data to provide, secure, and support the service, and to communicate with you about it — on the basis of performance of our contract with you and our legitimate interests in running and improving Fonda. We process hotel and mailbox data solely to deliver the features the hotel has enabled (morning briefings, email drafting, check-in chasing, and answering questions about the hotel's own data), on the documented instructions of the hotel as controller. Where required, we rely on the hotel having obtained any necessary consent from its guests.",
    ],
  },
  {
    heading: "AI processing",
    paragraphs: [
      "To generate briefings, classify emails, draft replies, and answer questions, we send the relevant hotel data to our AI sub-processor, Anthropic, via its API. This data is processed to produce output for the hotel and, under Anthropic's commercial API terms, is not used to train its models. We do not sell personal data, and we do not use guest personal data to train any models of our own.",
    ],
  },
  {
    heading: "Sub-processors",
    paragraphs: [
      "We rely on the following sub-processors to run Fonda. We maintain contracts with each requiring appropriate data-protection safeguards, and we will keep this list current:",
    ],
    bullets: [
      "Supabase — database and authentication (hosting of account and hotel data).",
      "Vercel — application hosting and delivery.",
      "Anthropic — AI processing of briefings, email drafts, and queries.",
      "Google (Gmail API) — where a hotel connects its inbox.",
      "Resend — outbound email delivery (e.g. briefing emails).",
      "Sentry — error monitoring (configured not to send guest personal data).",
      "The hotel's chosen PMS (MEWS or Apaleo) and mailbox provider, which remain independent controllers of the data in their own systems.",
    ],
  },
  {
    heading: "International transfers",
    paragraphs: [
      "Some sub-processors are located outside the European Economic Area. Where data is transferred outside the EEA, we rely on an adequacy decision or on the European Commission's Standard Contractual Clauses (together with any additional safeguards required) to protect it.",
    ],
  },
  {
    heading: "Retention",
    paragraphs: [
      "We keep account data for as long as you have an account and for a reasonable period afterwards to meet legal, accounting, and security obligations. Hotel and mailbox data processed on a hotel's behalf is retained per our Data Processing Agreement and deleted or returned on request or when the hotel closes its account, subject to short-term backups. Connection tokens are deleted when a hotel disconnects an integration.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "We apply technical and organisational measures appropriate to the risk, including encryption of connection tokens at rest, strict per-hotel access controls enforced at the database level (row-level security), least-privilege service access, and error monitoring. No system is perfectly secure, but we work to protect your data and to notify affected parties of any breach as required by law.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      `Subject to conditions in the GDPR, you have the right to access, rectify, erase, restrict, and port your personal data, and to object to certain processing. To exercise these rights over account data, contact ${COMPANY.privacyEmail}. If you are a hotel guest, please direct requests to the hotel that holds your booking (the controller); we will assist that hotel in responding. You also have the right to lodge a complaint with the Spanish supervisory authority, the Agencia Española de Protección de Datos (AEPD, www.aepd.es).`,
    ],
  },
  {
    heading: "Cookies",
    paragraphs: [
      "Fonda uses only the cookies strictly necessary to keep you signed in and to keep the service secure. We do not use advertising cookies. If we add analytics in future, we will update this policy and request consent where required.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "We may update this policy from time to time. Material changes will be notified through the service or by email. The date below indicates when it was last revised.",
    ],
  },
];

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { dict } = await loadDictionary((await params).lang);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {dict.legal.privacyTitle}
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
                <li
                  key={i}
                  className="flex gap-2.5 text-muted-foreground"
                >
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
        Contact: {COMPANY.privacyEmail}
      </p>
    </article>
  );
}
