import type { Metadata } from "next";
import { CatalogPage } from "@/components/pages/catalog-page";
import { EnglishRegistryBundle } from "@/components/providers/english-registry-bundle";
import { buildPageMetadata } from "@/lib/seo";
import { getDictionary } from "@/lib/i18n";
import { setRequestLocale } from "@/lib/i18n/locale";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  const d = getDictionary("en");
  return buildPageMetadata({
    title: d.directory.seoTitle,
    description: d.directory.seoDescription,
    path: "/en/tools/",
    locale: "en",
  });
}

export default function Page() {
  setRequestLocale("en");
  // The catalogue filters the tool list on the client: ship the English registry with it.
  return (
    <>
      <EnglishRegistryBundle />
      <CatalogPage />
    </>
  );
}
