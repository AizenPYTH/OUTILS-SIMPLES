import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { isLegalIdentityIncomplete, publisherKind } from "@/lib/legal";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mentions légales",
  description: `Mentions légales du site ${siteConfig.name} : éditeur, hébergeur, propriété intellectuelle.`,
  path: "/mentions-legales/",
});

/**
 * Wording follows NEXT_PUBLIC_LEGAL_PUBLISHER_KIND: a private person is never
 * described as a company (no registered office, no SIREN or VAT line unless
 * one is supplied), and the anonymous option of LCEN art. 1-1, II publishes
 * the host only. Missing values show an "à compléter" marker, never a guess.
 */
export default function MentionsLegalesPage() {
  const l = siteConfig.legal;
  const kind = publisherKind();
  return (
    <LegalPage title="Mentions légales" path="/mentions-legales/" updatedAt="28 octobre 2026">
      {isLegalIdentityIncomplete() ? (
        <p className="rounded-md border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
          Les informations encadrées ci-dessous doivent être renseignées via les variables
          d&apos;environnement <code>NEXT_PUBLIC_LEGAL_*</code> (voir{" "}
          <code>docs/LANCEMENT_SANS_PUBLICITE.md</code>) avant la mise en ligne. Ce modèle ne
          constitue pas un conseil juridique.
        </p>
      ) : null}
      <section>
        <h2>Éditeur du site</h2>
        {kind === "company" ? (
          <>
            <p>
              Le site {siteConfig.name} est édité par{" "}
              <Placeholder label="Raison sociale" value={l.publisherName} />,{" "}
              <Placeholder label="Forme juridique" value={l.publisherStatus} />, dont le siège est
              situé <Placeholder label="Adresse du siège" value={l.publisherAddress} />, téléphone :{" "}
              <Placeholder label="Téléphone" value={l.publisherPhone} />.
            </p>
            <p>
              Immatriculation :{" "}
              <Placeholder label="Numéro SIREN/SIRET ou RCS" value={l.registrationNumber} />
              {l.vatNumber ? ` · TVA intracommunautaire : ${l.vatNumber}` : ""}.
            </p>
            <p>
              Directeur de la publication :{" "}
              <Placeholder label="Directeur de la publication" value={l.publicationDirector} />.
            </p>
          </>
        ) : kind === "anonymous" ? (
          <p>
            Le site {siteConfig.name} est édité à titre non professionnel par une personne physique
            qui a choisi de préserver son anonymat, comme le permet l&apos;article 1-1, II de la loi
            n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique. Ses
            éléments d&apos;identification ont été communiqués à l&apos;hébergeur indiqué
            ci-dessous.
          </p>
        ) : (
          <>
            <p>
              Le site {siteConfig.name} est édité par{" "}
              <Placeholder label="Nom et prénoms" value={l.publisherName} />, personne physique
              {l.publisherStatus ? `, ${l.publisherStatus}` : ""}.
            </p>
            <p>
              Domicile : <Placeholder label="Domicile de l'éditeur" value={l.publisherAddress} />.
            </p>
            <p>
              Téléphone : <Placeholder label="Téléphone de l'éditeur" value={l.publisherPhone} />.
            </p>
            {l.registrationNumber ? <p>Immatriculation : {l.registrationNumber}.</p> : null}
            <p>
              Directeur de la publication :{" "}
              <Placeholder label="Nom et prénom" value={l.publicationDirector || l.publisherName} />
              .
            </p>
          </>
        )}
        <p>
          Contact : <Placeholder label="Adresse e-mail de contact" value={l.contactEmail} />.
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par <Placeholder label="Hébergeur" value={l.hostingProvider} />,{" "}
          <Placeholder label="Adresse de l'hébergeur" value={l.hostingAddress} />
          {kind === "anonymous" && !l.hostingPhone ? null : (
            <>
              , téléphone : <Placeholder label="Téléphone de l'hébergeur" value={l.hostingPhone} />
            </>
          )}
          .
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La structure du site, ses textes et ses éléments graphiques sont protégés par le droit
          d&apos;auteur. Les bibliothèques open source utilisées restent soumises à leurs licences
          respectives. Les documents que vous traitez avec les outils restent votre propriété
          exclusive : ils ne sont ni transmis ni conservés par l&apos;éditeur.
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
