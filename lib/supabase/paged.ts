import "server-only";

/**
 * Reading a whole table's worth of rows out of Supabase.
 *
 * PostgREST caps every response at 1,000 rows and says nothing about it — you
 * get 1,000 rows and no error. For a hotel with more than a thousand
 * reservations in the window that silently undercounts occupancy, which is
 * worse than an outright failure: the page still renders, just with wrong
 * numbers. (Measured on the test hotel: 1,677 matching reservations, 1,000
 * returned.) Anything that counts rows must page through them.
 */

/** PostgREST's own ceiling. */
const PAGE_SIZE = 1000;

/**
 * Refuses to loop forever if a query keeps returning full pages. 20 pages is
 * 20,000 reservations — far beyond a 200-room hotel's fortnight, so hitting it
 * means something is wrong rather than merely large.
 */
const MAX_PAGES = 20;

/** Chunk size for `.in(...)` filters — keeps the request URL a sane length. */
const IN_CHUNK = 200;

interface PagedResult<T> {
  data: T[] | null;
  error: unknown;
}

/**
 * Runs `page` repeatedly with widening ranges until a short page comes back.
 *
 * The caller's query MUST have a stable `.order(...)` on a column that is
 * unique within the result, or rows can be skipped or repeated between pages.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<PagedResult<T>>
): Promise<T[]> {
  const all: T[] = [];

  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return all;
}

/**
 * Splits a long `.in(...)` list into several requests and concatenates the
 * results. An `.in()` of a few thousand ids would both exceed the row cap and
 * build a URL long enough to be rejected.
 */
export async function fetchInChunks<T>(
  values: string[],
  page: (chunk: string[]) => PromiseLike<PagedResult<T>>
): Promise<T[]> {
  const all: T[] = [];

  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await page(values.slice(i, i + IN_CHUNK));
    if (error || !data) continue;
    all.push(...data);
  }

  return all;
}
