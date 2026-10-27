/**
 * Registers the English text of the tools (`src/lib/tools/registry/en`).
 * Server: imported by the root layouts (hreflang of French pages need the
 * English slugs) and the sitemap. Client: loaded only by the English
 * catalogue/category pages (`EnglishRegistryBundle`) and before a tool
 * component is mounted on an English page (`tool-renderer.tsx`), so that
 * English pages without a tool list do not download both registries.
 */
import { registerToolLocalizations } from "@/lib/tools/queries";
import { toolsEn } from "@/lib/tools/registry/en";

registerToolLocalizations("en", toolsEn);
