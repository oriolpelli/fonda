/**
 * Guest-name pseudonymisation.
 *
 * ONE RULE, used in two places, which is why it lives here rather than in
 * either of them: a guest's surname is reduced to an initial before their name
 * is stored or sent anywhere durable. "María Villanueva" becomes "María V."
 *
 * CALLERS (keep this list current — it is the audit trail):
 *   · lib/briefing.ts        — every guest name in the briefing context, before
 *                              it reaches the model and before the brief is
 *                              stored.
 *   · app/api/chat/route.ts  — chat_logs.content, before insert. The LIVE
 *                              request to Claude keeps real names and the GM
 *                              sees real names on screen; only the durable copy
 *                              is reduced (APP_UX_PROPOSAL.md §11 decision 6,
 *                              point 2).
 *
 * Pure and dependency-free, so the rule can be exercised directly.
 */

/** "John Smith" → "John S." Structured input: first and last are already split. */
export function pseudoName(
  first?: string | null,
  last?: string | null
): string {
  const f = (first ?? "").trim();
  const initial = (last ?? "").trim() ? `${last!.trim()[0].toUpperCase()}.` : "";
  return [f, initial].filter(Boolean).join(" ") || "Guest";
}

/** A guest whose name should be reduced wherever it appears in free text. */
export interface NameToReduce {
  first: string | null;
  last: string | null;
}

/** Characters that mean something to a regex, escaped so a name can't be one. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reduces every "First Last" in free text to "First L.".
 *
 * FREE TEXT IS THE HARD CASE and this is deliberately conservative. It matches
 * only a known guest's FULL name — first and last, adjacent, as whole words —
 * drawn from the hotel's own customer list. It does not try to spot surnames on
 * their own.
 *
 * That is a real limit, so it is worth being explicit about what it does and
 * does not buy. "What room is María Villanueva in?" is reduced. "Villanueva is
 * complaining again" is not: reducing bare surnames would mean matching every
 * customer's last name against every message, which turns common surnames into
 * a censor that mangles ordinary sentences, and a GM cannot trust a transcript
 * that has been quietly rewritten. The typed-full-name case is the one that
 * actually occurs — people paste the name as the PMS shows it — and it is the
 * one this closes.
 *
 * Longest names first, so "Ana María Villanueva" is not half-matched by "Ana
 * María" when both are guests.
 */
export function reduceSurnames(text: string, names: NameToReduce[]): string {
  if (!text) return text;

  const pairs = names
    .map((n) => ({
      first: (n.first ?? "").trim(),
      last: (n.last ?? "").trim(),
    }))
    .filter((n) => n.first.length > 0 && n.last.length > 1)
    .sort((a, b) => `${b.first} ${b.last}`.length - `${a.first} ${a.last}`.length);

  let out = text;
  for (const { first, last } of pairs) {
    // \b on both ends so "Ana" does not match inside "Anabel", and the
    // whitespace run is flexible because people paste odd spacing.
    const pattern = new RegExp(
      `\\b${escapeRegExp(first)}\\s+${escapeRegExp(last)}\\b`,
      "gi"
    );
    out = out.replace(pattern, pseudoName(first, last));
  }
  return out;
}
