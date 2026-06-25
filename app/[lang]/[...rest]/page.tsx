import { notFound } from "next/navigation";

// Catches any unmatched path under a valid locale (explicit routes take
// precedence) and triggers the localized, styled `app/[lang]/not-found.tsx`
// — which renders inside the [lang] layout, so it keeps fonts, globals, and
// the dictionary provider. Without this, unmatched URLs fall through to Next's
// default unstyled 404.
export default function CatchAllNotFound(): never {
  notFound();
}
