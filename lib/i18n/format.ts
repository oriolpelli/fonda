/**
 * Minimal interpolation helpers for dictionary strings. Avoids an ICU runtime
 * dependency — sufficient for en/es/ca UI copy.
 */

/** Substitutes `{name}`-style placeholders in a template. */
export function t(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}

/**
 * Two-form cardinal pluralization (en/es/ca all use one/other for cardinals).
 * `one` and `other` are templates; `{count}` is injected automatically.
 */
export function plural(
  count: number,
  one: string,
  other: string,
  vars?: Record<string, string | number>
): string {
  return t(count === 1 ? one : other, { count, ...vars });
}
