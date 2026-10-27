import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { LegalPage } from "@/components/content/legal-page";
import { ConsentSettings } from "@/components/monetization/consent-settings";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Cookie and consent settings",
    description: `View and change your consent preferences on ${siteConfig.name}. No tracker is loaded without your agreement.`,
    path: "/en/cookies/",
    locale: "en",
  });
}

export default function CookiesPage() {
  setRequestLocale("en");
  const thirdParties =
    publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none" || publicEnv.NEXT_PUBLIC_ADS_ENABLED;
  return (
    <LegalPage
      title="Cookie settings"
      path="/en/cookies/"
      intro="Your consent preferences, viewable and editable at any time."
    >
      <section>
        <h2>What the site stores on your device</h2>
        <ul>
          <li>
            <strong>Theme</strong> (light / dark / system) — local storage, essential, no
            identifier.
          </li>
          <li>
            <strong>Consent choices</strong> — local storage, so we do not ask again on every visit.
          </li>
        </ul>
        {thirdParties ? (
          <p>
            Third-party services subject to consent are configured on this site. They only load
            after your agreement.
          </p>
        ) : (
          <p>
            <strong>No third-party service (analytics, advertising) is currently enabled.</strong>{" "}
            No advertising cookie or tracker is therefore set. The settings below exist for the day
            the publisher enables such services.
          </p>
        )}
      </section>
      <section>
        <h2>Your preferences</h2>
        <ConsentSettings />
      </section>
    </LegalPage>
  );
}
