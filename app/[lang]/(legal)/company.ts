// -----------------------------------------------------------------------------
// Company / legal entity details used across the legal pages.
//
// ⚠️ FILL THESE IN before launch. Everything in [BRACKETS] is a placeholder that
// must be replaced with your real registered details. These pages are a solid,
// GDPR-aware starting point but are NOT a substitute for review by a qualified
// lawyer — have them checked before you charge customers.
// -----------------------------------------------------------------------------

export const COMPANY = {
  /** Registered legal name of the Sociedad Limitada. */
  legalName: "[Fonda Technologies, S.L.]",
  /** Trading / product name shown to users. */
  brand: "Fonda",
  /** Spanish tax id. */
  taxId: "[CIF: B-00000000]",
  /** Registered office address. */
  address: "[Street, Postal code, City], Spain",
  /** Commercial registry entry, if available. */
  registry: "[Registro Mercantil de —, Tomo —, Folio —, Hoja —]",
  /** General + privacy contact addresses. */
  contactEmail: "hello@fonda.app",
  privacyEmail: "privacy@fonda.app",
  /** Public site + governing jurisdiction. */
  domain: "fonda.app",
  governingLawCountry: "Spain",
  courtsCity: "[Barcelona]",
  /** Headline subscription price (keep in sync with the pricing page / Stripe). */
  price: "€199 per month per hotel property",
} as const;

// Effective/last-updated date shown on the documents. Update when you revise them.
export const LEGAL_LAST_UPDATED = "1 July 2026";
