import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Politique de confidentialité",
  description: `Comment ${siteConfig.name} traite vos fichiers et vos données : traitement local dans le navigateur, aucun stockage de documents, services tiers soumis à consentement.`,
  path: "/confidentialite/",
});

export default function ConfidentialitePage() {
  const analytics = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const ads = publicEnv.NEXT_PUBLIC_ADS_ENABLED;
  return (
    <LegalPage
      title="Politique de confidentialité"
      path="/confidentialite/"
      intro="Ce que nous faisons, et surtout ce que nous ne faisons pas, avec vos fichiers et vos données."
      updatedAt="25 octobre 2026"
    >
      <section>
        <h2>1. Vos fichiers ne quittent pas votre navigateur</h2>
        <p>
          Tous les outils PDF publiés sur {siteConfig.name} fonctionnent intégralement dans votre
          navigateur, grâce aux bibliothèques open source pdf.js (affichage) et pdf-lib
          (modification). Concrètement :
        </p>
        <ul>
          <li>
            le fichier que vous déposez est lu par votre navigateur et n&apos;est jamais transmis à
            nos serveurs ;
          </li>
          <li>
            le résultat est généré sur votre appareil et téléchargé directement depuis celui-ci ;
          </li>
          <li>
            aucun fichier, aucun contenu de document, aucun nom de fichier n&apos;est stocké,
            journalisé ou analysé par nous ;
          </li>
          <li>
            les données temporaires sont libérées dès que vous quittez la page ou traitez un autre
            fichier.
          </li>
        </ul>
        <p>
          Si un outil nécessitant un traitement sur serveur était ajouté à l&apos;avenir, il serait
          clairement signalé sur sa page (mention « Traitement sur nos serveurs ») et cette
          politique serait mise à jour avant sa publication.
        </p>
      </section>
      <section>
        <h2>2. Données techniques</h2>
        <p>
          Comme tout site web, nos serveurs d&apos;hébergement peuvent enregistrer des journaux
          techniques (adresse IP, horodatage, page demandée, navigateur) nécessaires à la sécurité
          et au bon fonctionnement du service. Ces journaux sont conservés par l&apos;hébergeur
          selon sa propre politique (
          <Placeholder
            label="Hébergeur et durée de conservation"
            value={siteConfig.legal.hostingProvider}
          />
          ).
        </p>
      </section>
      <section>
        <h2>3. Préférences stockées sur votre appareil</h2>
        <p>
          Nous utilisons le stockage local de votre navigateur (localStorage), et non des cookies,
          pour mémoriser votre thème (clair/sombre) et vos choix de consentement. Ces informations
          ne contiennent aucun identifiant et ne nous sont jamais transmises.
        </p>
      </section>
      <section>
        <h2>4. Mesure d&apos;audience</h2>
        {analytics === "none" ? (
          <p>
            <strong>Aucun outil de mesure d&apos;audience n&apos;est actuellement activé.</strong>{" "}
            Si l&apos;éditeur en active un, il ne se chargera qu&apos;après votre consentement
            explicite, et les événements mesurés (page vue, outil utilisé, succès ou erreur) ne
            contiendront jamais de nom de fichier ni de contenu de document.
          </p>
        ) : (
          <p>
            Un outil de mesure d&apos;audience (
            {analytics === "plausible" ? "Plausible Analytics" : "Google Analytics 4"}) est
            configuré. Il ne se charge qu&apos;après votre consentement et les événements mesurés ne
            contiennent jamais de nom de fichier ni de contenu de document. Vous pouvez modifier
            votre choix à tout moment sur la page{" "}
            <Link href="/gestion-cookies/">Gestion des cookies</Link>.
          </p>
        )}
      </section>
      <section>
        <h2>5. Publicité</h2>
        {ads ? (
          <p>
            Des espaces publicitaires fournis par un partenaire tiers (Google AdSense) sont affichés
            sur certaines pages. Ils ne se chargent qu&apos;après votre consentement, recueilli via
            une plateforme de gestion du consentement. Le partenaire peut alors déposer des cookies
            et traiter des données conformément à sa propre politique de confidentialité.
          </p>
        ) : (
          <p>
            <strong>Aucune publicité n&apos;est actuellement diffusée.</strong> Si l&apos;éditeur
            active un partenaire publicitaire, cette section et la page de gestion des cookies
            seront mises à jour, et aucun script publicitaire ne sera chargé sans votre
            consentement.
          </p>
        )}
      </section>
      <section>
        <h2>6. Vos droits</h2>
        <p>
          Dans la mesure où nous ne collectons pas de données personnelles via les outils, les
          demandes d&apos;accès, de rectification ou d&apos;effacement concernent principalement les
          éventuels échanges par e-mail. Vous pouvez nous contacter à{" "}
          <Placeholder label="Adresse e-mail de contact" value={siteConfig.legal.contactEmail} />.
          Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL.
        </p>
      </section>
      <section>
        <h2>7. Responsable du traitement</h2>
        <p>
          <Placeholder label="Nom ou raison sociale" value={siteConfig.legal.publisherName} /> —
          voir les <Link href="/mentions-legales/">mentions légales</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
