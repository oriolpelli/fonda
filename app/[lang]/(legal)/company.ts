// -----------------------------------------------------------------------------
// Company / legal entity details used across the legal pages.
//
// ⚠️ FILL THESE IN before launch. Everything in [BRACKETS] is a placeholder that
// must be replaced with your real registered details. These pages are a solid,
// GDPR-aware starting point but are NOT a substitute for review by a qualified
// lawyer — have them checked before you charge customers.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Price — one number, three renderings.
//
// `PRICE_MONTHLY_EUR` is the only place the figure is written down. Everything
// that shows or charges a price derives from it, so the copies cannot drift:
//
//   • `COMPANY.priceMonthly` — the bare figure the marketing dictionaries
//     interpolate (`stats.priceValue`, `pricing.price`). It carries no currency
//     symbol because en writes "€199" and es/ca write "199 €".
//   • `COMPANY.price` — the legal prose rendered on /terms.
//   • `STRIPE_UNIT_AMOUNT` — minor units (cents), the amount the Stripe price
//     object must be created with.
//
// Stripe is the one copy the compiler cannot reach: the price object lives in
// the Stripe dashboard, not in this repo (there is no Stripe integration here
// yet). Create it from `STRIPE_UNIT_AMOUNT` / `PRICE_CURRENCY` rather than by
// typing the number again, and changing the price stays a one-line edit here
// plus one dashboard change.
// -----------------------------------------------------------------------------
const PRICE_MONTHLY_EUR = 199;

/** ISO currency for every price we render or charge. */
export const PRICE_CURRENCY = "EUR";

/** The subscription price in minor units — what Stripe must be charging. */
export const STRIPE_UNIT_AMOUNT = PRICE_MONTHLY_EUR * 100;

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
   * The bare monthly figure for the marketing site. The currency symbol is
   * placed per-locale by the dictionary templates (`stats.priceValue`,
   * `pricing.price` interpolate `{price}`). Derived — edit
   * `PRICE_MONTHLY_EUR` above.
   */
  priceMonthly: String(PRICE_MONTHLY_EUR),
  /** Headline subscription price as legal prose (/terms). Derived. */
  price: `€${PRICE_MONTHLY_EUR} per month per hotel property`,
} as const;

// Effective/last-updated date shown on the documents. Update when you revise them.
export const LEGAL_LAST_UPDATED = "1 July 2026";
