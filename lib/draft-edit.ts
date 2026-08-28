import type { EditBucket } from "@/lib/analytics";

/**
 * How much did the GM change our draft before sending it?
 *
 * This is the raw material of the PMF metric: a draft sent unchanged, or with
 * a light touch, is a draft that worked. Buckets rather than a raw distance,
 * because the question we are answering is categorical ("did this land?") and
 * because a bucket is the only thing we are willing to store — see the note on
 * `draft_edit_events` about why no message text ever leaves this function.
 */

/**
 * Similarity at or above this is a "minor" edit — a typo, a name, a sentence
 * reworded. Below it the GM effectively rewrote the reply, and the draft did
 * not do its job. Tuned to be forgiving: the metric should reward drafts that
 * saved work, not only ones that were perfect.
 */
const MINOR_EDIT_THRESHOLD = 0.9;

/**
 * Levenshtein is O(n×m). Hotel replies are a few hundred characters; anything
 * past this is pathological, so compare the first 4,000 characters and accept
 * the approximation rather than burning CPU on a send path.
 */
const MAX_COMPARE_CHARS = 4000;

/** Collapses whitespace so reflowing a paragraph isn't counted as an edit. */
function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Standard two-row Levenshtein distance — O(n×m) time, O(min(n,m)) space. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Iterate over the shorter string so the row we keep is as small as possible.
  if (a.length > b.length) [a, b] = [b, a];

  let previous = Array.from({ length: a.length + 1 }, (_, i) => i);
  let current = new Array<number>(a.length + 1);

  for (let j = 1; j <= b.length; j++) {
    current[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const substitution = previous[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[i] = Math.min(current[i - 1] + 1, previous[i] + 1, substitution);
    }
    [previous, current] = [current, previous];
  }

  return previous[a.length];
}

export interface DraftEdit {
  bucket: EditBucket;
  /** 0–100, rounded. 100 means the sent text matched the draft exactly. */
  similarityPct: number;
}

/**
 * Compares the draft we generated against what was actually sent.
 *
 * Returns only a bucket and a percentage — never the texts, never a diff.
 * Both arguments are guest-facing message bodies, so nothing derived from
 * them may be stored beyond what this returns.
 *
 * A missing or empty draft (a reply typed from scratch, or a classification we
 * never draft for) counts as `major` at 0% — we contributed nothing to it.
 */
export function measureDraftEdit(
  drafted: string | null | undefined,
  sent: string | null | undefined
): DraftEdit {
  const draftText = normalise(drafted ?? "").slice(0, MAX_COMPARE_CHARS);
  const sentText = normalise(sent ?? "").slice(0, MAX_COMPARE_CHARS);

  if (!draftText || !sentText) return { bucket: "major", similarityPct: 0 };
  if (draftText === sentText) return { bucket: "none", similarityPct: 100 };

  const distance = levenshtein(draftText, sentText);
  const similarity =
    1 - distance / Math.max(draftText.length, sentText.length);
  const similarityPct = Math.max(0, Math.min(100, Math.round(similarity * 100)));

  return {
    bucket: similarity >= MINOR_EDIT_THRESHOLD ? "minor" : "major",
    similarityPct,
  };
}
