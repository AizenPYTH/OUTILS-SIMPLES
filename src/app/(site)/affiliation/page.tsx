import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Information sur l'affiliation et la publicité",
  description: `Comment ${siteConfig.name} se finance : publicité et liens d'affiliation éventuels, toujours signalés.`,
  path: "/affiliation/",
});

export default function AffiliationPage() {
  return (
    <LegalPage title="Information sur l'affiliation et la publicité" path="/affiliation/">
      <section>
        <h2>Un service gratuit, financé de manière transparente</h2>
        <p>
          Les outils de {siteConfig.name} sont gratuits. Pour couvrir les coûts d&apos;hébergement
          et de développement, le site pourra afficher de la publicité et, dans certains guides,
          recommander des produits ou services via des liens d&apos;affiliation.
        </p>
      </section>
      <section>
        <h2>Liens d&apos;affiliation</h2>
        <p>
          Lorsqu&apos;un lien d&apos;affiliation est présent, il est signalé explicitement à
          proximité (« lien affilié »). Si vous achetez via ce lien, nous pouvons percevoir une
          commission, sans surcoût pour vous. Nous ne recommandons que des produits que nous jugeons
          réellement utiles au sujet traité, et nous ne publions ni avis fictifs ni prix non
          vérifiés.
        </p>
        <p>
          <strong>À ce jour, aucun lien d&apos;affiliation n&apos;est présent sur le site.</strong>
        </p>
      </section>
      <section>
        <h2>Publicité</h2>
        <p>
          Les éventuels emplacements publicitaires sont identifiés par la mention « Publicité », ne
          sont jamais placés dans les zones de dépôt de fichiers ni dans l&apos;éditeur, et ne se
          chargent qu&apos;après votre consentement.
        </p>
      </section>
    </LegalPage>
  );
}
