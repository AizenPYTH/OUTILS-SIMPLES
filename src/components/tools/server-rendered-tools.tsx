"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n/locale";
import type { ServerRenderedToolId } from "./ssr-tool-ids";

/**
 * Form tools rendered on the server as well as in the browser: their initial
 * layout is deterministic, so the page is painted with the real tool instead
 * of a loading placeholder that the tool would later push down (layout shift,
 * measured in docs/RAPPORT_FINALISATION_AVEROPDF.md).
 *
 * - `next/dynamic` with plain `import()` calls: each tool keeps its own chunk
 *   (a static import from the shared tool page would put the three tools in
 *   the initial JavaScript of all 69 tool pages), and Next can preload it.
 * - One entry per language: English pages also load the English tool texts,
 *   needed before hydration; French pages do not.
 * - The `inert` shell lives inside the entry, so nothing above the lazy
 *   boundary re-renders during hydration (which would bring back a fallback).
 */
const entries: Record<Locale, Record<ServerRenderedToolId, React.ComponentType>> = {
  fr: {
    "qr-generate": dynamic(() => import("./ssr/qr-generator-entry")),
    "dev-regex": dynamic(() => import("./ssr/regex-entry")),
    "dev-uuid": dynamic(() => import("./ssr/uuid-entry")),
  },
  en: {
    "qr-generate": dynamic(() => import("./ssr/qr-generator-entry-en")),
    "dev-regex": dynamic(() => import("./ssr/regex-entry-en")),
    "dev-uuid": dynamic(() => import("./ssr/uuid-entry-en")),
  },
};

export function ServerRenderedTool({
  toolId,
  locale,
}: {
  toolId: ServerRenderedToolId;
  locale: Locale;
}) {
  const Entry = entries[locale][toolId];
  return (
    <div data-tool-slot={toolId}>
      <Entry />
    </div>
  );
}
