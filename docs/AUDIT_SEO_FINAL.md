# Audit SEO final

Date : 2026-10-27 (mis à jour lors de la validation pré-lancement), sur le build de production local
(URL `http://localhost:3000` : en production, `NEXT_PUBLIC_SITE_URL` remplace cette valeur partout).
Vérifications faites par un sondage HTTP de **chaque URL du sitemap** (191 pages : 98 FR, 93 EN) et
par les tests `tests/unit/i18n.test.ts`, `tests/unit/registry.test.ts`, `e2e/site.spec.ts`,
`e2e/i18n.spec.ts`, `e2e/ads.spec.ts`.

## 0. Sondage exhaustif du build (exécuté)

Pour chacune des 191 URL du sitemap : statut 200 ; `lang` conforme à l'arbre ; canonical égal à
l'URL ; `hreflang` de la page vers elle-même, **réciprocité vérifiée en chargeant chaque page
alternative** ; `x-default` présent et égal au français ; `robots` « index, follow » ; image
Open Graph présente (et répondant 200 pour les pages échantillonnées) ; titres et descriptions
uniques par langue ; aucune trace publicitaire. Résultat : **aucune anomalie structurelle**.
Deux observations de longueur :

- 35 pages FR dont le titre rendu dépasse 75 caractères : le titre du registre (≤ 70, contrôlé par
  test) reçoit le suffixe « | AVEROPDF ». Google tronque l'affichage vers 60–70 caractères ; la partie
  utile est en tête. Décision : conservé (P2, à retravailler titre par titre si la Search Console
  signale des titres réécrits).
- Les descriptions des familles PDF, numérisation, texte et développeur dépassaient 170 caractères :
  raccourcies à 162–171 (apostrophes comprises). Les descriptions d'outils respectent la règle ≤ 165
  (test du registre).

Statuts contrôlés : `/nope/` et `/en/nope/` → 404 ; `/en/pdf/fusionner/` (slug français sous `/en/`)
et `/pdf/merge/` (slug anglais à la racine) → 404 ; `/en` → 308 `/en/` ; `/pdf/fusionner` → 308
`/pdf/fusionner/` ; `/EN/` → 404. `robots.txt` : `Allow: /`, `Disallow: /api/ /_next/`, sitemap absolu.

**Catalogue et familles rendus côté serveur** : avant cette mission, `/outils/`, `/en/tools/` et les
18 pages de familles ne contenaient aucune carte d'outil dans le HTML (liste rendue côté client à
cause de `useSearchParams`). Corrigé : 77 cartes dans le HTML du catalogue, 27 dans `/pdf/`, FR et EN.

**Prévisualisation** : `NEXT_PUBLIC_NOINDEX=true` rend tout le site non indexable (robots, meta,
en-tête, sitemap vide) ; refusé par `pnpm check:launch` en production.

## 1. Structure et indexabilité

| Point            | État                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages indexables | accueil, catalogue, 9 familles, 69 outils, guides, pages éditoriales — dans les deux langues (≈ 180 URL)                                                                                                                                       |
| `noindex`        | `/hors-ligne/`, `/en/offline/`, pages 404, outils non publiés (aucun aujourd'hui)                                                                                                                                                              |
| `robots.txt`     | `Allow: /`, `Disallow: /api/ /_next/`, `Sitemap` absolu                                                                                                                                                                                        |
| `sitemap.xml`    | 122 entrées avant → entrées FR + EN avec `xhtml:link hreflang` (fr, en, x-default) ; aucune route anglaise inexistante (test « sitemap exposes both languages without invented English routes » : chaque URL `/en/` échantillonnée répond 200) |
| Canonical        | une par page, propre à sa langue, URL absolue                                                                                                                                                                                                  |
| `hreflang`       | réciproques fr/en + `x-default` (= français) sur toutes les pages qui ont un équivalent ; absents quand l'équivalent n'existe pas                                                                                                              |
| `lang`           | `fr` sur la racine française, `en` sur `/en/`                                                                                                                                                                                                  |
| 404              | statut 404, `noindex`, contenu dans la langue de l'arbre ; rendu côté client après la coquille Next (`docs/INTERNATIONALISATION.md` § 2)                                                                                                       |

## 2. Métadonnées par page

- Titres uniques par page et par langue (≤ 70 caractères, vérifié par `validateRegistry` sur les
  deux registres) ; descriptions 70–165 caractères, uniques.
- Un seul `h1` par page (vérifié e2e sur accueil, outil, guide, catalogue).
- Open Graph / Twitter : `og:locale` `fr_FR` / `en_US`, `og:url` canonique, image 1200 × 630 générée
  par page (accueil, familles, outils, guides) avec bandeau traduit. **Correctif de cette mission** :
  l'image OG de l'accueil français avait disparu avec la création des deux racines (fichier
  `opengraph-image.tsx` hors groupe) ; déplacée dans `src/app/(fr)/`.
- JSON-LD : `WebSite` + `SearchAction` (accueil), `SoftwareApplication`/`HowTo`/`FAQPage` (outils),
  `Article` (guides), `BreadcrumbList`, `inLanguage` selon la langue.

## 3. Contenu

- Chaque outil : description, étapes, limites, FAQ (36 outils avec FAQ enrichie), note de
  confidentialité ; traduction complète en anglais (69/69).
- 4 guides FR et leurs 4 équivalents EN liés par `hreflang`.
- Maillage : fil d'Ariane, outils liés, guides liés, familles depuis l'accueil et le pied de page.

## 4. Reste à faire côté propriétaire

1. Renseigner `NEXT_PUBLIC_SITE_URL` et vérifier canonical/sitemap sur le domaine réel.
2. Search Console : soumettre le sitemap, surveiller le rapport « Ciblage international » (hreflang).
3. Valider une page de partage FR et EN avec les validateurs sociaux.
4. Relecture éditoriale des titres anglais par un locuteur natif (les textes ont été produits dans
   cette session et validés automatiquement : longueurs, unicité, absence de français).
5. Après lancement : surveiller l'indexation des doublons de langue (attendu : « page alternative
   avec balise canonique correcte » pour aucune page, puisque chaque langue a son canonical).
