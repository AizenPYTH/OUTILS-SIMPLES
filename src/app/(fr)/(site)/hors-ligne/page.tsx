import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { OfflineToolList } from "@/components/offline/offline-tool-list";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedTools, getToolPath } from "@/lib/tools";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Hors connexion",
    description: `Utiliser les outils ${siteConfig.name} sans connexion internet : ce qui fonctionne, ce qui ne fonctionne pas, et comment enregistrer un outil sur cet appareil.`,
    path: "/hors-ligne/",
  }),
  robots: { index: false, follow: true },
};

/** Served by the service worker when a page is requested offline and is not cached. */
export default function HorsLignePage() {
  const names = Object.fromEntries(
    getPublishedTools().map((tool) => [getToolPath(tool), tool.name]),
  );
  const icons = Object.fromEntries(
    getPublishedTools().map((tool) => [
      getToolPath(tool),
      { icon: tool.icon, category: tool.category },
    ]),
  );
  return (
    <LegalPage
      title="Hors connexion"
      path="/hors-ligne/"
      intro="Les outils fonctionnent entièrement dans votre navigateur : une fois enregistrés sur cet appareil, ils n'ont plus besoin d'internet."
    >
      <section>
        <h2>Outils enregistrés sur cet appareil</h2>
        <OfflineToolList names={names} icons={icons} />
      </section>
      <section>
        <h2>Comment enregistrer un outil</h2>
        <p>
          Ouvrez la page de l&apos;outil quand vous êtes connecté et appuyez sur « Utiliser hors
          ligne » sous la zone de travail. La page, ses scripts et les moteurs nécessaires (rendu
          PDF, reconnaissance de texte, polices) sont alors stockés par votre navigateur. Le poids à
          télécharger est indiqué avant de confirmer.
        </p>
        <p>
          Toute page visitée est aussi conservée automatiquement pendant quelque temps, mais seul
          l&apos;enregistrement explicite garantit que les moteurs lourds sont présents.
        </p>
      </section>
      <section>
        <h2>Ce qui ne fonctionne pas sans connexion</h2>
        <ul>
          <li>La première visite : le site doit être chargé au moins une fois en ligne.</li>
          <li>Les outils non enregistrés et jamais ouverts sur cet appareil.</li>
          <li>
            La reconnaissance de texte en anglais si elle n&apos;a jamais été utilisée en ligne sur
            cet appareil (seul le modèle français est enregistré avec l&apos;outil OCR).
          </li>
          <li>
            Les PDF utilisant des polices asiatiques (tables de correspondance chargées à la
            demande) et les polices de l&apos;éditeur autres que Liberation si elles n&apos;ont
            jamais été utilisées en ligne.
          </li>
          <li>Les mises à jour du site, appliquées à la prochaine visite connectée.</li>
        </ul>
        <p>
          Le navigateur peut supprimer ces fichiers s&apos;il manque d&apos;espace, en navigation
          privée, ou après une longue période sans visite (Safari limite la durée de conservation).
          Rien n&apos;est stocké ailleurs que sur votre appareil.
        </p>
      </section>
      <p>
        <Link href="/outils/">Voir tous les outils</Link>
      </p>
    </LegalPage>
  );
}
