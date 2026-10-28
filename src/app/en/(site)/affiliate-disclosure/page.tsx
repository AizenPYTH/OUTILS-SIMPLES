import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { adsConfig } from "@/config/ads";
import { LegalPage } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Affiliate and advertising disclosure",
    description: `Advertising and affiliate links on ${siteConfig.name}: the current situation and the publisher's commitments.`,
    path: "/en/affiliate-disclosure/",
    locale: "en",
  });
}

/** Same content as the French page (src/app/(fr)/(site)/affiliation/page.tsx). */
export default function AffiliatePage() {
  setRequestLocale("en");
  const ads = adsConfig().enabled;
  return (
    <LegalPage
      title="Affiliate and advertising disclosure"
      path="/en/affiliate-disclosure/"
      updatedAt="28 October 2026"
    >
      <section>
        <h2>Current situation</h2>
        <p>
          The {siteConfig.name} tools are free.{" "}
          {ads ? (
            <>The site shows advertising slots, described below.</>
          ) : (
            <strong>The site shows no advertising.</strong>
          )}{" "}
          <strong>There is no affiliate link on the site.</strong>
        </p>
      </section>
      <section>
        <h2>Commitments</h2>
        <p>
          If affiliate links were added, each one would be explicitly marked nearby (“affiliate
          link”) and this page would be updated. Only products considered genuinely useful for the
          topic would be recommended, with neither fake reviews nor unverified prices.
        </p>
        <p>
          Any advertising slot would be labelled “Advertisement”, never placed in file drop zones or
          in the editor, and would only load after your consent. The privacy policy would be updated
          before any activation.
        </p>
      </section>
    </LegalPage>
  );
}
