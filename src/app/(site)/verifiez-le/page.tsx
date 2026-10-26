import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Vérifiez-le vous-même",
  description: `Comment constater par vous-même que ${siteConfig.name} ne transmet pas vos fichiers : onglet Réseau du navigateur, mode hors connexion, code des bibliothèques utilisées.`,
  path: "/verifiez-le/",
});

/** Reproducible checks of the "nothing leaves your browser" promise, not just a claim. */
export default function VerifiezLePage() {
  return (
    <LegalPage
      title="Vérifiez-le vous-même"
      path="/verifiez-le/"
      intro="« Vos fichiers ne quittent pas votre navigateur » est une promesse facile à faire. Voici trois façons de la contrôler, en quelques minutes, sans compétence particulière."
    >
      <section>
        <h2>1. Regarder le trafic réseau pendant un traitement</h2>
        <ol>
          <li>
            Ouvrez un outil, par exemple Fusionner des PDF, puis les outils de développement du
            navigateur (F12, ou Ctrl/Cmd + Maj + I) et l&apos;onglet « Réseau » (Network).
          </li>
          <li>
            Cochez « Conserver le journal » et déposez vos fichiers, lancez le traitement,
            téléchargez le résultat.
          </li>
          <li>
            Observez les requêtes : seuls des fichiers du site lui-même sont chargés (scripts,
            polices, moteurs WebAssembly sous /pdfjs, /ocr, /qpdf, /fonts, /heif). Aucune requête
            POST, aucun envoi vers un autre domaine, aucune requête dont la taille correspondrait à
            votre document.
          </li>
        </ol>
        <p>
          Avec la configuration par défaut, le site ne charge aucun service tiers. Si l&apos;éditeur
          active une mesure d&apos;audience ou de la publicité, elle n&apos;est chargée
          qu&apos;après votre consentement et n&apos;a jamais accès au contenu de vos fichiers.
        </p>
      </section>
      <section>
        <h2>2. Couper la connexion</h2>
        <p>
          Ouvrez la page de l&apos;outil, puis passez en mode avion ou désactivez le Wi-Fi. Déposez
          un fichier et lancez le traitement : il aboutit, car tout le code nécessaire a été chargé
          avec la page. Avec « Utiliser hors ligne », l&apos;outil reste même disponible pour les
          visites suivantes sans réseau (voir{" "}
          <Link href="/hors-ligne/">la page hors connexion</Link>).
        </p>
      </section>
      <section>
        <h2>3. Lire le code</h2>
        <p>
          Les traitements reposent sur des bibliothèques open source que vous pouvez consulter :
          pdf.js et pdf-lib (PDF), Tesseract.js (reconnaissance de texte), qpdf (chiffrement),
          libheif (photos HEIC), mammoth, exceljs et docx (conversions Office). Elles sont servies
          par le site lui-même, sans CDN tiers, et s&apos;exécutent dans votre navigateur.
        </p>
        <p>
          La politique de sécurité du site (en-tête Content-Security-Policy, visible dans
          l&apos;onglet Réseau) interdit au code de contacter d&apos;autres domaines que le site
          lui-même : même une erreur de programmation ne pourrait pas envoyer un fichier ailleurs
          sans que le navigateur la bloque.
        </p>
      </section>
      <section>
        <h2>Ce que cela ne couvre pas</h2>
        <ul>
          <li>
            Votre navigateur et ses extensions peuvent eux-mêmes envoyer des données
            (synchronisation, extensions de capture) : cela ne dépend pas du site.
          </li>
          <li>
            Le fichier téléchargé est enregistré sur votre appareil, dans le dossier de
            téléchargements : à vous de le protéger ou de le supprimer.
          </li>
          <li>
            Rien n&apos;est stocké par le site, mais la mémoire du navigateur garde le document
            ouvert tant que l&apos;onglet l&apos;est : fermez l&apos;onglet sur un appareil partagé.
          </li>
        </ul>
      </section>
      <p>
        <Link href="/confidentialite/">Politique de confidentialité</Link> ·{" "}
        <Link href="/a-propos/">À propos</Link>
      </p>
    </LegalPage>
  );
}
