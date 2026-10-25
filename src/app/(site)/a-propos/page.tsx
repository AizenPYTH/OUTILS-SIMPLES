import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedTools } from "@/lib/tools";

export const metadata: Metadata = buildPageMetadata({
  title: "À propos",
  description: `${siteConfig.name} : des outils en ligne simples, rapides et respectueux de vos fichiers, traités directement dans votre navigateur.`,
  path: "/a-propos/",
});

export default function AProposPage() {
  const count = getPublishedTools().length;
  return (
    <LegalPage
      title={`À propos de ${siteConfig.name}`}
      path="/a-propos/"
      intro={siteConfig.tagline}
    >
      <section>
        <h2>Pourquoi ce site</h2>
        <p>
          Les tâches du quotidien sur les fichiers — fusionner deux PDF, signer un devis, alléger
          une pièce jointe — ne devraient pas exiger un logiciel payant ni l&apos;envoi de documents
          personnels à un service inconnu. {siteConfig.name} rassemble des outils qui font une
          chose, la font bien, et la font dans votre navigateur.
        </p>
      </section>
      <section>
        <h2>Comment ça fonctionne</h2>
        <p>
          Les {count} outils publiés aujourd&apos;hui reposent sur deux bibliothèques open source
          éprouvées : pdf.js, développée par Mozilla, pour afficher les pages, et pdf-lib pour les
          modifier. Le fichier est lu par votre navigateur, transformé sur votre appareil, puis
          téléchargé : il ne transite par aucun serveur.
        </p>
      </section>
      <section>
        <h2>Ce que nous ne faisons pas</h2>
        <ul>
          <li>Nous ne publions pas d&apos;outil tant qu&apos;il ne fonctionne pas réellement.</li>
          <li>
            Nous n&apos;affichons pas de faux témoignages, compteurs d&apos;utilisateurs ou
            promesses irréalistes.
          </li>
          <li>Nous ne conservons ni n&apos;analysons vos documents.</li>
        </ul>
      </section>
      <section>
        <h2>Et ensuite</h2>
        <p>
          La suite PDF est la première étape. Des outils pour les images, le texte et les petites
          entreprises suivront, toujours avec la même exigence. Une question, une idée ? Rendez-vous
          sur la page <Link href="/contact/">contact</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
