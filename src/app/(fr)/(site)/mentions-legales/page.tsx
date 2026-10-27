import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mentions légales",
  description: `Mentions légales du site ${siteConfig.name} : éditeur, hébergeur, propriété intellectuelle.`,
  path: "/mentions-legales/",
});

export default function MentionsLegalesPage() {
  const l = siteConfig.legal;
  return (
    <LegalPage title="Mentions légales" path="/mentions-legales/">
      <p className="rounded-md border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
        Les informations encadrées ci-dessous doivent être renseignées via les variables
        d&apos;environnement <code>NEXT_PUBLIC_LEGAL_*</code> (voir{" "}
        <code>docs/MISE_EN_LIGNE.md</code>) avant la mise en ligne. Ce modèle ne constitue pas un
        conseil juridique et ne garantit pas, à lui seul, la conformité du site aux obligations
        légales (loi pour la confiance dans l&apos;économie numérique, RGPD, etc.).
      </p>
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site {siteConfig.name} est édité par{" "}
          <Placeholder label="Nom ou raison sociale" value={l.publisherName} />,{" "}
          <Placeholder label="Forme juridique / statut" value={l.publisherStatus} />, dont le siège
          est situé <Placeholder label="Adresse" value={l.publisherAddress} />.
        </p>
        <p>
          Immatriculation :{" "}
          <Placeholder label="Numéro SIREN/SIRET ou RCS" value={l.registrationNumber} /> · TVA
          intracommunautaire : <Placeholder label="Numéro de TVA" value={l.vatNumber} />.
        </p>
        <p>
          Directeur de la publication :{" "}
          <Placeholder label="Directeur de la publication" value={l.publicationDirector} />.
        </p>
        <p>
          Contact : <Placeholder label="Adresse e-mail de contact" value={l.contactEmail} />.
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par <Placeholder label="Hébergeur" value={l.hostingProvider} />,{" "}
          <Placeholder label="Adresse de l'hébergeur" value={l.hostingAddress} />.
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La structure du site, ses textes et ses éléments graphiques sont protégés par le droit
          d&apos;auteur. Les bibliothèques open source utilisées (notamment pdf.js et pdf-lib)
          restent soumises à leurs licences respectives. Les documents que vous traitez avec les
          outils restent votre propriété exclusive : ils ne sont ni transmis ni conservés par
          l&apos;éditeur.
        </p>
      </section>
      <section>
        <h2>Responsabilité</h2>
        <p>
          Les outils sont fournis à titre gratuit et en l&apos;état. L&apos;éditeur s&apos;efforce
          d&apos;en assurer le bon fonctionnement mais ne saurait garantir l&apos;absence
          d&apos;erreur ni l&apos;adéquation du résultat à un usage particulier. Vérifiez toujours
          les documents produits avant de les utiliser.
        </p>
      </section>
    </LegalPage>
  );
}
