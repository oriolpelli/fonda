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
  legalName: "[Fondas Technologies, S.L.]",
  /** Trading / product name shown to users. */
  brand: "Fondas",
  /** Spanish tax id. */
  taxId: "[CIF: B-00000000]",
  /** Registered office address. */
  address: "[Street, Postal code, City], Spain",
  /** Commercial registry entry, if available. */
  registry: "[Registro Mercantil de —, Tomo —, Folio —, Hoja —]",
  /** General + privacy contact addresses. */
  contactEmail: "hello@fondas.app",
  privacyEmail: "privacy@fondas.app",
  /** Public site + governing jurisdiction. */
  domain: "fondas.app",
  governingLawCountry: "Spain",
  courtsCity: "[Barcelona]",
  /**
   * The bare monthly figure — the single source for every price the marketing
   * site *renders*. The currency symbol is placed per-locale by the dictionary
   * templates (`stats.priceValue`, `pricing.price` interpolate `{price}`),
   * because en writes "€199" and es/ca write "199 €".
   *
   * Two copies of this number are still synced by hand and will not follow a
   * change here:
   *   1. `price` below — legal prose, rendered on the legal pages.
   *   2. The Stripe price object — the amount customers are actually charged.
   * Change all three together, and check the legal pages after.
   */
  priceMonthly: "199",
  /** Headline subscription price (keep in sync with `priceMonthly` / Stripe). */
  price: "€199 per month per hotel property",
} as const;

// Effective/last-updated date shown on the documents. Update when you revise them.
export const LEGAL_LAST_UPDATED = "1 July 2026";
