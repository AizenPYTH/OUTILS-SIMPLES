import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Affiliate and advertising disclosure",
    description: `How ${siteConfig.name} is funded: possible advertising and affiliate links, always disclosed.`,
    path: "/en/affiliate-disclosure/",
    locale: "en",
  });
}

export default function AffiliatePage() {
  setRequestLocale("en");
  return (
    <LegalPage title="Affiliate and advertising disclosure" path="/en/affiliate-disclosure/">
      <section>
        <h2>A free service, funded transparently</h2>
        <p>
          The {siteConfig.name} tools are free. To cover hosting and development costs, the site may
          show advertising and, in some guides, recommend products or services through affiliate
          links.
        </p>
      </section>
      <section>
        <h2>Affiliate links</h2>
        <p>
          When an affiliate link is present, it is explicitly marked nearby (“affiliate link”). If
          you buy through it, we may earn a commission at no extra cost to you. We only recommend
          products we consider genuinely useful for the topic, and we publish neither fake reviews
          nor unverified prices.
        </p>
        <p>
          <strong>To date, no affiliate link is present on the site.</strong>
        </p>
      </section>
      <section>
        <h2>Advertising</h2>
        <p>
          Any advertising slot is labelled “Advertisement”, is never placed in file drop zones or in
          the editor, and only loads after your consent.
        </p>
      </section>
    </LegalPage>
  );
}
