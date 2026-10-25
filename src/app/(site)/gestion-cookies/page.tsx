import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { LegalPage } from "@/components/content/legal-page";
import { ConsentSettings } from "@/components/monetization/consent-settings";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Gestion des cookies et du consentement",
  description: `Consultez et modifiez vos préférences de consentement sur ${siteConfig.name}. Aucun traceur n'est chargé sans votre accord.`,
  path: "/gestion-cookies/",
});

export default function GestionCookiesPage() {
  const thirdParties = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none" || publicEnv.NEXT_PUBLIC_ADS_ENABLED;
  return (
    <LegalPage
      title="Gestion des cookies"
      path="/gestion-cookies/"
      intro="Vos préférences de consentement, consultables et modifiables à tout moment."
    >
      <section>
        <h2>Ce que le site stocke sur votre appareil</h2>
        <ul>
          <li>
            <strong>Thème</strong> (clair / sombre / système) — stockage local, indispensable au fonctionnement, sans identifiant.
          </li>
          <li>
            <strong>Choix de consentement</strong> — stockage local, pour ne pas vous redemander votre avis à chaque visite.
          </li>
        </ul>
        {thirdParties ? (
          <p>Des services tiers soumis à consentement sont configurés sur ce site. Ils ne se chargent qu&apos;après votre accord.</p>
        ) : (
          <p>
            <strong>Aucun service tiers (mesure d&apos;audience, publicité) n&apos;est actuellement activé.</strong> Aucun cookie
            publicitaire ni traceur n&apos;est donc déposé. Les réglages ci-dessous sont présents pour le jour où l&apos;éditeur
            activerait de tels services.
          </p>
        )}
      </section>
      <section>
        <h2>Vos préférences</h2>
        <ConsentSettings />
      </section>
    </LegalPage>
  );
}
