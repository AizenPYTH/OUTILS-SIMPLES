import type { Metadata } from "next";
import { CatalogPage } from "@/components/pages/catalog-page";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/i18n";

export const metadata: Metadata = buildPageMetadata({
  title: t.directory.seoTitle,
  description: t.directory.seoDescription,
  path: "/outils/",
});

export default function Page() {
  return <CatalogPage />;
}
