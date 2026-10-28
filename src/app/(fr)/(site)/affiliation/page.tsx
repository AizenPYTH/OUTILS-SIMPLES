import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { adsConfig } from "@/config/ads";
import { LegalPage } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Information sur l'affiliation et la publicité",
  description: `Publicité et liens d'affiliation sur ${siteConfig.name} : la situation actuelle et les engagements de l'éditeur.`,
  path: "/affiliation/",
});

/** States the current situation from the configuration: no ads unless they are really enabled. */
export default function AffiliationPage() {
  const ads = adsConfig().enabled;
  return (
    <LegalPage
      title="Information sur l'affiliation et la publicité"
      path="/affiliation/"
      updatedAt="28 octobre 2026"
    >
      <section>
        <h2>Situation actuelle</h2>
        <p>
          Les outils de {siteConfig.name} sont gratuits.{" "}
          {ads ? (
            <>Le site affiche des emplacements publicitaires, décrits ci-dessous.</>
          ) : (
            <strong>Le site n&apos;affiche aucune publicité.</strong>
          )}{" "}
          <strong>Aucun lien d&apos;affiliation n&apos;est présent sur le site.</strong>
        </p>
      </section>
      <section>
        <h2>Engagements</h2>
        <p>
          Si des liens d&apos;affiliation étaient ajoutés, chacun serait signalé explicitement à
          proximité (« lien affilié ») et cette page serait mise à jour. Seuls des produits jugés
          réellement utiles au sujet traité seraient recommandés, sans avis fictif ni prix non
          vérifié.
        </p>
        <p>
          Tout emplacement publicitaire serait identifié par la mention « Publicité », jamais placé
          dans les zones de dépôt de fichiers ni dans l&apos;éditeur, et ne se chargerait
          qu&apos;après votre consentement. La politique de confidentialité serait mise à jour avant
          toute activation.
        </p>
      </section>
    </LegalPage>
  );
}
