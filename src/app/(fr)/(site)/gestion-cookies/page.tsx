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

/** Lists every kind of storage the site writes on the device (checked 2026-10-28). */
export default function GestionCookiesPage() {
  const thirdParties =
    publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER !== "none" || publicEnv.NEXT_PUBLIC_ADS_ENABLED;
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
            <strong>Thème</strong> (clair / sombre / système) — stockage local, indispensable au
            fonctionnement, sans identifiant.
          </li>
          <li>
            <strong>Choix de consentement</strong> — stockage local, pour ne pas vous redemander
            votre avis à chaque visite.
          </li>
          <li>
            <strong>Copies des pages et fichiers du site</strong> — cache du navigateur (service
            worker), pour accélérer les visites et faire fonctionner le mode hors ligne.
          </li>
          <li>
            <strong>Modèles de langue de la reconnaissance de texte</strong> — base IndexedDB, après
            le premier usage de l&apos;OCR, pour ne pas les retélécharger.
          </li>
        </ul>
        <p>
          Aucun de ces éléments n&apos;est un cookie, ne contient d&apos;identifiant ni de donnée
          vous concernant, et aucun n&apos;est transmis à l&apos;éditeur ou à un tiers.
        </p>
        {thirdParties ? (
          <p>
            Des services tiers soumis à consentement sont configurés sur ce site. Ils ne se chargent
            qu&apos;après votre accord.
          </p>
        ) : (
          <p>
            <strong>
              Aucun service tiers (mesure d&apos;audience, publicité) n&apos;est actuellement
              activé.
            </strong>{" "}
            Aucun cookie publicitaire ni traceur n&apos;est donc déposé. Les réglages ci-dessous
            sont présents pour le jour où l&apos;éditeur activerait de tels services.
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
