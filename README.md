# OUTILIA — outils en ligne simples, rapides et privés

OUTILIA est une plateforme d'outils en ligne dont la première brique est une **suite PDF complète traitée
intégralement dans le navigateur** : fusionner, diviser, extraire, organiser, pivoter, compresser, ajouter du
texte, annoter, signer, ajouter / gérer un filigrane, remplir un formulaire, et un éditeur plein écran.
Aucun fichier ne quitte l'appareil de l'utilisateur.

Le projet est conçu pour devenir un site à trafic organique (SEO) monétisable (publicité, premium, affiliation)
sans sacrifier la confiance : rien n'est publié tant que ça ne fonctionne pas, aucun chiffre ou témoignage
n'est inventé, et les limites techniques sont écrites noir sur blanc sur chaque page.

## Stack

| Couche      | Choix                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Application | Next.js 16 (App Router, Turbopack, génération statique), React 19, TypeScript strict           |
| Style       | Tailwind CSS 4 + tokens CSS issus de la charte (`src/app/globals.css`), polices auto-hébergées |
| Composants  | Primitives Radix (dialog, select, slider…), lucide-react, sonner, dnd-kit                      |
| PDF         | pdf.js (rendu, vignettes) + pdf-lib (manipulation), fflate (ZIP)                               |
| Validation  | Zod (variables d'environnement), vérifications de signature de fichiers                        |
| Tests       | Vitest (unitaires + intégration sur fichiers réels), Playwright (parcours complets, mobile)    |

## Démarrage

```bash
pnpm install          # copie aussi les actifs pdf.js dans public/pdfjs (postinstall)
cp .env.example .env.local
pnpm dev              # http://localhost:3000
```

Commandes :

| Commande                    | Rôle                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                  | serveur de développement                                                    |
| `pnpm build` / `pnpm start` | build de production et serveur                                              |
| `pnpm typecheck`            | `next typegen` + `tsc --noEmit`                                             |
| `pnpm lint`                 | ESLint (config Next core-web-vitals + TypeScript)                           |
| `pnpm test`                 | tests unitaires et d'intégration Vitest                                     |
| `pnpm test:e2e`             | Playwright (lance `pnpm start` sur le port 3100 ; faire `pnpm build` avant) |
| `pnpm fixtures`             | régénère les PDF de test synthétiques dans `tests/fixtures`                 |
| `pnpm check`                | typecheck + lint + tests + build                                            |

Prérequis : Node ≥ 20.9, pnpm 10.

## Variables d'environnement

Toutes sont publiques (`NEXT_PUBLIC_*`), validées par Zod dans `src/config/env.ts`, et documentées dans
`.env.example`. Aucune n'est obligatoire en développement. En production :

| Variable                                                                                      | Rôle                                                                               |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                                        | origine canonique (sitemap, canonical, Open Graph). **Obligatoire en production.** |
| `NEXT_PUBLIC_ADS_ENABLED`                                                                     | `true` pour activer les emplacements AdSense (défaut `false`)                      |
| `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_*`                                    | identifiants AdSense                                                               |
| `NEXT_PUBLIC_CONSENT_MODE`                                                                    | `builtin` (bannière interne) ou `external` (CMP certifiée à brancher)              |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER`                                                              | `none` (défaut), `plausible` ou `gtag`                                             |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_HOST`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` | configuration du fournisseur                                                       |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`                                                        | balise de vérification Search Console                                              |

Il n'y a aucun secret côté serveur : le site n'a ni base de données ni API.

## Architecture (résumé)

Voir `docs/ARCHITECTURE.md` pour le détail.

```
src/
  config/        marque (OUTILIA), env, limites, en-têtes de sécurité / CSP
  lib/tools/     registre d'outils typé = source unique (navigation, recherche, sitemap, SEO)
  lib/pdf/       opérations pdf-lib pures et testées, modèle d'annotations, coordonnées, couche pdf.js
  lib/files/     validation (signatures), noms de fichiers sûrs, téléchargement
  lib/consent/   état de consentement first-party ; lib/analytics/ : événements sans données sensibles
  components/    ui (design system), layout, tools (catalogue, page outil), pdf (outils + éditeur), monetization
  app/           routes : / (catalogue), /[category]/, /[category]/[slug]/, guides, pages légales, sitemap, robots
```

### Registre d'outils

`src/lib/tools/registry.ts` décrit chaque outil (id, slug, catégorie, textes, SEO, statut, indexabilité,
formats, limites, outils liés, contenu éditorial). Un outil n'est public que si `status === "published"` ;
les entrées `planned` servent de feuille de route et de suggestions de recherche mais ne génèrent aucune
page. `validateRegistry()` (testé) vérifie l'unicité des ids/slugs/titres/descriptions et la complétude des
entrées publiées. Ajouter un outil = une entrée dans le registre + un composant dans
`src/components/pdf/tool-renderer.tsx`.

### Traitement PDF

- `src/lib/pdf/operations/*` : fonctions pures (bytes → bytes) utilisables en Node, couvertes par les tests
  d'intégration de `tests/unit/pdf-operations.test.ts` qui vérifient le contenu des fichiers produits.
- `src/lib/pdf/annotations/*` : modèle d'annotations en espace PDF + export pdf-lib (texte, chemins,
  formes, surlignage, images) avec gestion des pages pivotées.
- `src/lib/pdf/coordinates.ts` : transformation écran ⇄ canvas ⇄ PDF partagée par l'aperçu et l'export.
- `src/lib/pdf/browser/*` : pdf.js (actifs servis depuis `/public/pdfjs`), réencodage d'images par canvas,
  lecture de fichiers, ZIP.
- Le filigrane OUTILIA est dessiné dans un bloc de contenu marqué (`/OutiliaWatermark BMC … EMC`) et
  enregistré dans le dictionnaire Info : c'est ce qui rend son retrait fiable.
- La compression copie les pages dans un document neuf (suppression des objets orphelins), active les
  flux d'objets et, en mode avec perte, réencode uniquement les images JPEG / Flate RVB-gris sans masque,
  en conservant l'original si le résultat serait plus lourd. Aucune page n'est pixellisée.

### Confidentialité

Tout le traitement est local. Aucun endpoint serveur, aucun stockage, aucun log de contenu. Les URL
d'objets sont révoquées après usage, les documents pdf.js détruits au changement de fichier. Les
événements analytics (`src/lib/analytics/events.ts`) sont filtrés par liste blanche et ne contiennent jamais
de nom de fichier.

## Tests

- `pnpm test` : 56 tests (plages de pages, validation, noms de fichiers, registre, sitemap, SEO, CSP, env,
  consentement, coordonnées, et toutes les opérations PDF sur fixtures réelles).
- `pnpm build && pnpm test:e2e` : 39 parcours Playwright (desktop + mobile Pixel 7) : catalogue, recherche,
  filtres, navigation, 404, métadonnées, sitemap/robots/CSP, thème, et pour chaque outil un parcours
  complet avec téléchargement vérifié par pdf-lib / pdf.js (fusion, division + ZIP, rotation, organisation,
  extraction, compression, filigrane + retrait, formulaire, éditeur texte/dessin/undo/export, signature).

## Déploiement

Le site est 100 % statique côté pages (SSG) avec des en-têtes HTTP définis dans `next.config.ts`. Il se
déploie sur toute plateforme compatible Next.js (Vercel, Netlify, Cloudflare, serveur Node).

1. Définir `NEXT_PUBLIC_SITE_URL=https://votre-domaine` (sans slash final) dans l'environnement de build.
2. `pnpm install && pnpm build` ; servir avec `pnpm start` (ou l'intégration Next.js de la plateforme).
3. Vérifier `https://votre-domaine/sitemap.xml` et `/robots.txt`, puis déclarer le sitemap dans Google
   Search Console.
4. Compléter `src/config/site.ts → legal` (éditeur, hébergeur, contact) : les pages légales affichent un
   marqueur « à compléter » tant que ces champs sont vides.

Pour un hébergement Node : `pnpm build` puis `PORT=3000 pnpm start` derrière un reverse proxy HTTPS.
Pour un export purement statique, `output: "export"` est possible (toutes les routes sont statiques) mais
les en-têtes de sécurité devront alors être configurés au niveau de l'hébergeur.

## Activer la monétisation

Tout est désactivé par défaut et le site reste complet sans.

**Publicité (AdSense)**

1. Obtenir l'approbation AdSense et créer les blocs (728×90 catalogue, 300×250 colonne outil, 728×90 bas de guide).
2. Mettre en place une CMP certifiée Google (TCF v2.2) pour le trafic EEE : `NEXT_PUBLIC_CONSENT_MODE=external`
   et charger le script de la CMP dans `src/components/monetization/consent-banner.tsx` (point d'intégration
   documenté). La bannière interne n'est pas une CMP certifiée.
3. Renseigner `NEXT_PUBLIC_ADS_ENABLED=true`, `NEXT_PUBLIC_ADSENSE_CLIENT`, les `NEXT_PUBLIC_ADSENSE_SLOT_*`.
   Les hôtes Google sont ajoutés automatiquement à la CSP (`src/config/security.ts`).
4. `AdSlot` réserve l'espace pour éviter les décalages ; aucun emplacement dans les zones de dépôt ni dans l'éditeur.

**Mesure d'audience** : `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible` (+ domaine) ou `gtag` (+ id GA4). Le script
n'est chargé qu'après consentement ; les événements suivis sont `tool_view/start/success/error/download`,
`search`, `consent_update`, `premium_cta_click`.

**Premium (futur)** : les limites vivent dans `src/config/limits.ts` et chaque outil déclare `premium` et
`featureFlags` dans le registre. Un paiement nécessiterait un prestataire (Stripe), une vérification côté
serveur par webhook et une base de données : voir `docs/ARCHITECTURE.md` § Premium.

## Limites connues

Voir `docs/KNOWN_LIMITATIONS.md`. Les principales : pas de modification du texte existant (annotations
superposées), polices standard PDF uniquement (latin), signature visuelle non qualifiée, retrait de
filigrane limité aux filigranes OUTILIA et aux annotations `/Watermark`, formulaires XFA non pris en charge.

## Licence des dépendances

pdf.js (Apache-2.0), pdf-lib (MIT), polices Bricolage Grotesque / Instrument Sans / Caveat (OFL-1.1).
