/**
 * Emits a JSON-LD `<script>`. Server-only by nature — the payload is built
 * from our own dictionary copy and constants, never from user input.
 *
 * `<` is escaped because a literal `</script>` anywhere in the serialized JSON
 * would close the tag early and turn the rest into markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
