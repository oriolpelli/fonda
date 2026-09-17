import type { Locale } from "@/lib/i18n/config";

/**
 * The one invented hotel the public site is allowed to describe.
 *
 * EVERYTHING HERE IS FICTIONAL. No real hotel, guest, reservation or figure is
 * behind any of it, and it must never be presented as anonymised real data.
 *
 * Why this file exists: the sample hotel used to be defined in four places at
 * once — the homepage bands, `app/[lang]/sample-brief/content.ts`, and a room
 * count hardcoded into all three dictionaries. They drifted, and the site ended
 * up promising "a 45-room hotel" on the homepage and delivering a 42-room one
 * on the page that link pointed at. This module is now the only definition;
 * every surface reads from it, and the dictionaries carry `{tokens}` rather
 * than numbers. If the sample hotel changes, it changes here and nowhere else.
 */
export const SAMPLE_HOTEL = {
  name: "Hotel Pati Blau",
  city: "Barcelona",
  rooms: 45,

  /**
   * The single night the whole site describes — the homepage brief, the
   * matched reservation beside it and the long-form sample brief are all this
   * same morning. Stored as ISO and formatted per locale by `sampleNightLine`,
   * so a translated date can't drift out of step with the English one.
   */
  nightISO: "2026-06-18",

  /** Tonight's picture: 40 of 45 sold, which is the 89% the brief quotes. */
  occupiedTonight: 40,
  occupancyPct: 89,
  arrivals: 12,
  departures: 7,

  /** The soft midweek date the brief flags for a rate decision. */
  softNightISO: "2026-06-25",
  softNightRooms: 22,

  /**
   * The guests named across the homepage bands and the long brief. Band 4's
   * reservation pane shows Vidal; the Aguirre-Miralles vacate the Garden Suite
   * the same morning, which is why Vidal can be booked into it from the 23rd.
   */
  guests: {
    vidal: "Elena Vidal",
    aguirreMiralles: "Aguirre-Miralles",
    bofill: "Núria Bofill",
    lund: "Henrik Lund",
    ortega: "Carmen Ortega",
    ashworth: "Ashworth",
  },
} as const;

/** Locale → the BCP-47 tag whose date conventions we want. */
const DATE_TAG: Record<Locale, string> = {
  en: "en-GB",
  es: "es-ES",
  ca: "ca-ES",
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * "Thursday, 18 June" / "Jueves, 18 de junio" / "Dijous, 18 de juny".
 *
 * Built from two Intl passes rather than one so the weekday keeps its comma in
 * every language: `en-GB` omits it in the combined form, and es/ca lower-case
 * the weekday, which is correct orthography but not how the rest of this copy
 * sets a date line. Formatting in UTC keeps the date stable wherever the
 * renderer happens to be.
 */
export function sampleNightLine(
  locale: Locale,
  options: { withYear?: boolean; iso?: string } = {}
): string {
  const { withYear = false, iso = SAMPLE_HOTEL.nightISO as string } = options;
  const tag = DATE_TAG[locale];
  const date = new Date(`${iso}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat(tag, {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  const rest = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(date);
  return `${capitalize(weekday)}, ${rest}`;
}

/** The soft midweek night, same formatting rules. */
export function sampleSoftNightLine(locale: Locale): string {
  return sampleNightLine(locale, { iso: SAMPLE_HOTEL.softNightISO });
}

/**
 * The variables every dictionary string about the sample hotel may interpolate.
 * Pass this straight into `t()`.
 */
export function sampleHotelVars(locale: Locale): Record<string, string | number> {
  return {
    hotel: SAMPLE_HOTEL.name,
    city: SAMPLE_HOTEL.city,
    rooms: SAMPLE_HOTEL.rooms,
    occupied: SAMPLE_HOTEL.occupiedTonight,
    occupancy: SAMPLE_HOTEL.occupancyPct,
    arrivals: SAMPLE_HOTEL.arrivals,
    departures: SAMPLE_HOTEL.departures,
    softRooms: SAMPLE_HOTEL.softNightRooms,
    date: sampleNightLine(locale),
    dateWithYear: sampleNightLine(locale, { withYear: true }),
    softDate: sampleSoftNightLine(locale),
    vidal: SAMPLE_HOTEL.guests.vidal,
    aguirre: SAMPLE_HOTEL.guests.aguirreMiralles,
    bofill: SAMPLE_HOTEL.guests.bofill,
    lund: SAMPLE_HOTEL.guests.lund,
    ortega: SAMPLE_HOTEL.guests.ortega,
    ashworth: SAMPLE_HOTEL.guests.ashworth,
  };
}
