/**
 * "Working with Fondas AI" — the AI literacy measure (AI_ACT_PROMPTS.md A6,
 * EU AI Act Art. 4). Plain module: the gate, the dialog, the Settings record
 * and its CSV all read from here.
 *
 * The five cards' words live in the dictionaries (`ai.literacy`); this holds
 * the version, the cookie that spares the layout a database read, and the
 * record's shapes.
 */

/**
 * The cards' version. BUMP IT when the cards say something materially new —
 * everyone is shown them again, and the record keeps both versions.
 */
export const AI_LITERACY_VERSION = "2026-10-02";

/**
 * A per-browser memo that THIS person has already seen THIS version, so the
 * dashboard layout doesn't ask the database on every click. It is a cache of
 * the table, never the record itself: clear it and the next page asks the
 * table again. Keyed to the person (a short hash of their id — a front-desk
 * computer is shared) and to the version.
 */
export const AI_LITERACY_COOKIE = "fondas_ai_literacy";

export type LiteracyStatus = "completed" | "skipped";

/** One row of ai_literacy_acks, as the record reads it. */
export interface LiteracyAck {
  user_id: string;
  version: string;
  status: LiteracyStatus;
  completed_at: string | null;
  created_at: string;
}

/** One person's standing for the current version, for the Settings table. */
export interface LiteracyStanding {
  userId: string;
  email: string;
  status: LiteracyStatus | "not-yet";
  /** When they completed (or, failing that, skipped) the current version. */
  at: string | null;
}

/**
 * Each person's standing on `version`: completed wins over skipped, the
 * latest of each counts, and someone with no row is "not yet".
 */
export function standings(
  people: { id: string; email: string }[],
  acks: LiteracyAck[],
  version: string = AI_LITERACY_VERSION
): LiteracyStanding[] {
  return people.map((person) => {
    const mine = acks
      .filter((a) => a.user_id === person.id && a.version === version)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const completed = mine.find((a) => a.status === "completed");
    if (completed) {
      return { userId: person.id, email: person.email, status: "completed", at: completed.completed_at };
    }
    if (mine[0]) {
      return { userId: person.id, email: person.email, status: "skipped", at: mine[0].created_at };
    }
    return { userId: person.id, email: person.email, status: "not-yet", at: null };
  });
}

function csvCell(value: string): string {
  // Quote everything; double any quote. A leading =, +, - or @ is prefixed
  // with an apostrophe so a spreadsheet never runs a cell as a formula.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * The hotel's Art. 4 evidence as CSV: every completion and skip, oldest
 * first, plus a "not yet" line for anyone with no row. Completion data only.
 */
export function literacyCsv(
  people: { id: string; email: string }[],
  acks: LiteracyAck[],
  headers: { person: string; version: string; status: string; date: string },
  labels: Record<LiteracyStatus | "not-yet", string>
): string {
  const emailOf = new Map(people.map((p) => [p.id, p.email]));
  const lines = [
    [headers.person, headers.version, headers.status, headers.date].map(csvCell).join(","),
  ];
  const sorted = [...acks].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  for (const ack of sorted) {
    lines.push(
      [
        emailOf.get(ack.user_id) ?? ack.user_id,
        ack.version,
        labels[ack.status],
        ack.completed_at ?? ack.created_at,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  const anyRow = new Set(acks.map((a) => a.user_id));
  for (const person of people) {
    if (!anyRow.has(person.id)) {
      lines.push([person.email, "", labels["not-yet"], ""].map(csvCell).join(","));
    }
  }
  return lines.join("\r\n") + "\r\n";
}
