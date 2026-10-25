/**
 * Renders a JSON-LD script. The payload is serialised with `<` escaped so a
 * string containing "</script>" can never break out of the tag.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
