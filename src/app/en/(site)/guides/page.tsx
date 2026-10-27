import type { Metadata } from "next";
import { GuidesIndexPage } from "@/components/pages/guides-index-page";
import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/lib/seo";
import { getDictionary } from "@/lib/i18n";
import { setRequestLocale } from "@/lib/i18n/locale";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  const d = getDictionary("en");
  return buildPageMetadata({
    title: d.guidesPage.seoTitle,
    description: d.guidesPage.seoDescription(siteConfig.name),
    path: "/en/guides/",
    locale: "en",
  });
}

export default function Page() {
  setRequestLocale("en");
  return <GuidesIndexPage />;
}
