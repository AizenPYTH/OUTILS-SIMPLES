import type { Metadata } from "next";
import { GuidesIndexPage } from "@/components/pages/guides-index-page";
import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/i18n";

export const metadata: Metadata = buildPageMetadata({
  title: t.guidesPage.seoTitle,
  description: t.guidesPage.seoDescription(siteConfig.name),
  path: "/guides/",
});

export default function Page() {
  return <GuidesIndexPage />;
}
