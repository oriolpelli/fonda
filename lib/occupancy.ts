/**
 * Occupancy — the one place that decides whether a room is sold on a given
 * night.
 *
 * The rule is the hotel one, not the calendar one: a stay occupies a room on
 * every night from its arrival date up to but NOT including its departure date.
 * A guest arriving the 1st and leaving the 3rd sells two nights (1st and 2nd);
 * the room is free and re-sellable on the night of the 3rd. Counting the
 * checkout day would overstate occupancy by roughly one room-night per stay.
 *
 * Everything here works on `YYYY-MM-DD` strings, which compare
 * lexicographically in calendar order — no Date arithmetic, no DST edge cases.
 * Callers convert their timestamps to hotel-local dates first (see
 * `localDateOf` in lib/stay-phase.ts).
 *
 * Pure and dependency-free so the dashboard and the morning brief can share it
 * and can never disagree about how full the hotel is.
 */

/** A stay reduced to the only two things occupancy cares about. */
export interface StayDates {
  /** Hotel-local check-in date (YYYY-MM-DD), or null if unknown. */
  arrival: string | null;
  /** Hotel-local check-out date (YYYY-MM-DD), or null if unknown. */
  departure: string | null;
}

export interface OccupancyDay {
  date: string;
  /** Rooms sold that night. */
  occupied: number;
  /** 0–100, rounded. Zero when the hotel's room count is unknown. */
  occupancyPct: number;
}

/** `YYYY-MM-DD` plus/minus whole days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** True when this stay sells a room on the night of `day`. */
export function coversNight(stay: StayDates, day: string): boolean {
  if (!stay.arrival || !stay.departure) return false;
  return stay.arrival <= day && day < stay.departure;
}

/** Rooms sold on the night of `day`. */
export function occupiedOn(stays: StayDates[], day: string): number {
  return stays.filter((s) => coversNight(s, day)).length;
}

/** Stays checking in on `day`. */
export function arrivalsOn(stays: StayDates[], day: string): number {
  return stays.filter((s) => s.arrival === day).length;
}

/** Stays checking out on `day`. */
export function departuresOn(stays: StayDates[], day: string): number {
  return stays.filter((s) => s.departure === day).length;
}

/** Occupancy as a percentage of the hotel's rooms. Zero rooms → zero. */
export function occupancyPct(occupied: number, rooms: number): number {
  return rooms > 0 ? Math.round((occupied / rooms) * 100) : 0;
}

/** Per-night occupancy for `days` nights starting at `from` (inclusive). */
export function occupancyOutlook(
  stays: StayDates[],
  rooms: number,
  from: string,
  days: number
): OccupancyDay[] {
  const out: OccupancyDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const occupied = occupiedOn(stays, date);
    out.push({ date, occupied, occupancyPct: occupancyPct(occupied, rooms) });
  }
  return out;
}
