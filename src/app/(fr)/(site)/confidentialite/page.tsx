import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { publisherKind } from "@/lib/legal";
import { getPublishedTools } from "@/lib/tools";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Politique de confidentialité",
  description: `Comment ${siteConfig.name} traite vos fichiers et vos données : traitement local dans le navigateur, aucun stockage de documents, services tiers soumis à consentement.`,
  path: "/confidentialite/",
});

/**
 * Describes what the code actually does (checked 2026-10-28): every published
 * tool runs in the browser (registry `processing: "client"`), the only
 * requests are for the site's own files, and the device keeps the theme, the
 * consent choice, cached site files and the OCR language models.
 */
export default function ConfidentialitePage() {
  const analytics = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const ads = publicEnv.NEXT_PUBLIC_ADS_ENABLED;
  const l = siteConfig.legal;
  const tools = getPublishedTools();
  const allLocal = tools.every((tool) => tool.processing === "client");
  return (
    <LegalPage
      title="Politique de confidentialité"
      path="/confidentialite/"
      intro="Ce que nous faisons, et surtout ce que nous ne faisons pas, avec vos fichiers et vos données."
      updatedAt="28 octobre 2026"
    >
      <section>
        <h2>1. Vos fichiers ne quittent pas votre navigateur</h2>
        <p>
          {allLocal
            ? `Les ${tools.length} outils publiés sur ${siteConfig.name} fonctionnent intégralement dans votre navigateur`
            : `Les outils marqués « Traitement dans votre navigateur » fonctionnent intégralement dans votre navigateur`}
          , grâce à des bibliothèques open source exécutées sur votre appareil (notamment pdf.js,
          pdf-lib, qpdf, Tesseract pour la reconnaissance de texte, libheif pour les photos HEIC).
          Concrètement :
        </p>
        <ul>
          <li>
            le fichier que vous déposez, ou la photo prise avec la caméra, est lu par votre
            navigateur et n&apos;est jamais transmis à un serveur ;
          </li>
          <li>
            le résultat est généré sur votre appareil et téléchargé directement depuis celui-ci ;
          </li>
          <li>
            aucun fichier, aucun contenu de document, aucun nom de fichier n&apos;est stocké,
            journalisé ou analysé par l&apos;éditeur ;
          </li>
          <li>
            les seuls téléchargements effectués par les outils concernent les fichiers du site
            lui-même (code, polices, moteur de reconnaissance de texte et modèles de langue) ;
          </li>
          <li>
            les données temporaires sont libérées dès que vous quittez la page ou traitez un autre
            fichier.
          </li>
        </ul>
        <p>
          Si un outil nécessitant un traitement sur serveur était ajouté à l&apos;avenir, il serait
          clairement signalé sur sa page (mention « Traitement sur nos serveurs ») et cette
          politique serait mise à jour avant sa publication. La page{" "}
          <Link href="/verifiez-le/">Vérifiez-le vous-même</Link> explique comment le constater.
        </p>
      </section>
      <section>
        <h2>2. Hébergement et données techniques</h2>
        <p>
          Les pages et les fichiers du site sont servis par l&apos;hébergeur (
          <Placeholder label="Hébergeur" value={l.hostingProvider} />, voir les{" "}
          <Link href="/mentions-legales/">mentions légales</Link>). Comme pour tout site web, chaque
          requête lui transmet des données techniques : adresse IP, date et heure, page ou fichier
          demandé, navigateur et page d&apos;origine. L&apos;hébergeur les traite pour acheminer les
          pages et assurer la sécurité du service, et les conserve selon sa propre politique de
          confidentialité. L&apos;éditeur ne s&apos;en sert pas pour suivre les visiteurs.
        </p>
        <p>
          Base légale : l&apos;intérêt légitime de l&apos;éditeur à fournir un site fonctionnel et
          sécurisé (article 6, 1, f du RGPD). Lorsque l&apos;hébergeur est établi hors de
          l&apos;Union européenne, les garanties qui encadrent le transfert (décision
          d&apos;adéquation ou clauses contractuelles types) sont décrites dans sa politique de
          confidentialité.
        </p>
      </section>
      <section>
        <h2>3. Ce qui est stocké sur votre appareil</h2>
        <p>
          Le site n&apos;utilise pas de cookie. Il conserve dans votre navigateur, sans identifiant
          et sans jamais nous les transmettre :
        </p>
        <ul>
          <li>
            votre thème (clair, sombre ou système) et vos choix de consentement (stockage local) ;
          </li>
          <li>
            des copies des pages et fichiers du site déjà consultés, et des outils que vous
            enregistrez pour le mode hors ligne (cache du navigateur, via un service worker) ;
          </li>
          <li>
            les modèles de langue de la reconnaissance de texte, après le premier usage de
            l&apos;OCR, pour ne pas les retélécharger (base IndexedDB du navigateur).
          </li>
        </ul>
        <p>
          Aucun de ces éléments ne contient vos documents ni de donnée vous concernant. Vous pouvez
          les supprimer à tout moment en effaçant les données du site dans les réglages de votre
          navigateur.
        </p>
      </section>
      <section>
        <h2>4. Mesure d&apos;audience</h2>
        {analytics === "none" ? (
          <p>
            <strong>Aucun outil de mesure d&apos;audience n&apos;est actuellement activé.</strong>{" "}
            Si l&apos;éditeur en active un, cette politique sera mise à jour avant son activation,
            et les mesures ne contiendront jamais de nom de fichier ni de contenu de document.
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
            <strong>Le site n&apos;affiche aucune publicité</strong> et ne charge aucun script
            publicitaire.
          </p>
        )}
      </section>
      <section>
        <h2>6. Si vous nous écrivez</h2>
        <p>
          Les messages envoyés à l&apos;adresse de contact (votre adresse e-mail et le contenu du
          message) servent uniquement à vous répondre et à suivre votre demande, puis sont supprimés
          lorsqu&apos;ils ne sont plus utiles à ce suivi. Ils ne sont ni vendus ni utilisés à des
          fins commerciales. N&apos;y joignez pas de document confidentiel.
        </p>
      </section>
      <section>
        <h2>7. Vos droits</h2>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
          d&apos;opposition et de limitation pour les données vous concernant. Écrivez à{" "}
          <Placeholder label="Adresse e-mail de contact" value={l.contactEmail} />. Vous pouvez
          aussi introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer">
            cnil.fr/fr/plaintes
          </a>
          ).
        </p>
      </section>
      <section>
        <h2>8. Responsable du traitement</h2>
        <p>
          {publisherKind() === "anonymous" ? (
            <>L&apos;éditeur du site</>
          ) : (
            <Placeholder label="Nom de l'éditeur" value={l.publisherName} />
          )}{" "}
          — voir les <Link href="/mentions-legales/">mentions légales</Link>. Contact :{" "}
          <Placeholder label="Adresse e-mail de contact" value={l.contactEmail} />.
        </p>
      </section>
    </LegalPage>
  );
}
