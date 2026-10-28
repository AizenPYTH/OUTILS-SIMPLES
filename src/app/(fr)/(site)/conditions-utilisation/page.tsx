import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Conditions d'utilisation",
  description: `Conditions d'utilisation des outils en ligne ${siteConfig.name} : usage gratuit, responsabilités, limites du service.`,
  path: "/conditions-utilisation/",
});

export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      path="/conditions-utilisation/"
      updatedAt="28 octobre 2026"
    >
      <section>
        <h2>1. Objet</h2>
        <p>
          {siteConfig.name} met à disposition des outils en ligne gratuits de manipulation de
          documents. L&apos;utilisation du site implique l&apos;acceptation des présentes
          conditions.
        </p>
      </section>
      <section>
        <h2>2. Usage autorisé</h2>
        <p>
          Vous vous engagez à n&apos;utiliser les outils que sur des documents dont vous êtes
          propriétaire ou que vous êtes autorisé à modifier. Il est notamment interdit
          d&apos;utiliser le service pour contourner des protections, supprimer des mentions de
          droits d&apos;auteur ou de propriété sans autorisation, ou porter atteinte aux droits de
          tiers.
        </p>
      </section>
      <section>
        <h2>3. Absence de garantie</h2>
        <p>
          Les outils sont fournis « en l&apos;état », sans garantie de résultat. Les traitements
          s&apos;exécutent dans votre navigateur : leur bon déroulement dépend aussi de votre
          appareil (mémoire disponible, version du navigateur). Conservez toujours une copie de vos
          fichiers d&apos;origine et vérifiez les documents produits.
        </p>
        <p>
          Les signatures apposées avec l&apos;outil « Signer un PDF » sont des signatures visuelles
          et ne constituent pas des signatures électroniques qualifiées au sens du règlement eIDAS.
        </p>
      </section>
      <section>
        <h2>4. Disponibilité et évolution</h2>
        <p>
          L&apos;éditeur peut modifier, suspendre ou retirer tout ou partie des outils à tout
          moment, notamment pour maintenance. Les outils sont proposés gratuitement et sans compte ;
          toute évolution de ces conditions serait annoncée sur cette page avant de
          s&apos;appliquer.
        </p>
      </section>
      <section>
        <h2>5. Données personnelles</h2>
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite/">politique de confidentialité</Link>.
        </p>
      </section>
      <section>
        <h2>6. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit français.</p>
      </section>
    </LegalPage>
  );
}
