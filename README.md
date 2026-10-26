# OUTILIA — outils en ligne simples, rapides et privés

OUTILIA est une plateforme de **66 outils en ligne traités intégralement dans le navigateur** : une suite
PDF complète (fusion, division, compression, édition, signature, protection, OCR, caviardage…), un scanner
de documents pour mobile, des outils images, texte, développeur, des calculatrices, des générateurs de
QR codes et codes-barres et des documents à imprimer. Aucun fichier ne quitte l'appareil de l'utilisateur :
il n'y a aucun endpoint serveur.

Le projet est conçu pour devenir un site à trafic organique (SEO) monétisable (publicité, premium, affiliation)
sans sacrifier la confiance : rien n'est publié tant que ça ne fonctionne pas, aucun chiffre ou témoignage
n'est inventé, et les limites techniques sont écrites noir sur blanc sur chaque page.

## Stack

| Couche      | Choix                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Application | Next.js 16 (App Router, Turbopack, génération statique), React 19, TypeScript strict           |
| Style       | Tailwind CSS 4 + tokens CSS issus de la charte (`src/app/globals.css`), polices auto-hébergées |
| Composants  | Primitives Radix (dialog, select, slider…), lucide-react, sonner, dnd-kit                      |
| PDF         | pdf.js (rendu, texte) + pdf-lib (manipulation), qpdf WebAssembly (chiffrement), fflate (ZIP)   |
| OCR / scan  | Tesseract.js 7 (WebAssembly, modèles fra/eng auto-hébergés), homographie et filtres maison     |
| Images      | Canvas + opérations pixel maison, exifr (lecture EXIF), encodeur PNG maison                    |
| Codes/docs  | qrcode, jsqr, encodeurs de codes-barres maison, marked + DOMPurify (Markdown), diff (Myers)    |
| Validation  | Zod (variables d'environnement), vérifications de signature de fichiers                        |
| Tests       | Vitest (unitaires + intégration sur fichiers réels), Playwright (parcours complets, mobile)    |

## Démarrage

```bash
pnpm install          # copie aussi les actifs pdf.js, Tesseract, modèles OCR et qpdf dans public/ (postinstall)
cp .env.example .env.local
pnpm dev              # http://localhost:3000
```

Commandes :

| Commande                                                                | Rôle                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                                                              | serveur de développement                                            |
| `pnpm build` / `pnpm start`                                             | build de production et serveur                                      |
| `pnpm typecheck`                                                        | `next typegen` + `tsc --noEmit`                                     |
| `pnpm lint`                                                             | ESLint (config Next core-web-vitals + TypeScript)                   |
| `pnpm test`                                                             | tests unitaires et d'intégration Vitest                             |
| `pnpm test:e2e`                                                         | Playwright (lance Next sur le port 3100 ; faire `pnpm build` avant) |
| `pnpm fixtures`                                                         | régénère les PDF de test synthétiques dans `tests/fixtures`         |
| `node scripts/generate-image-fixtures.mjs`                              | régénère les images de test (Chromium)                              |
| `node scripts/generate-links-fixture.mjs`, `generate-code-fixtures.mjs` | fixtures PDF liens/images et QR                                     |
| `pnpm check`                                                            | typecheck + lint + tests + build                                    |

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

## Catalogue (66 outils, 8 catégories actives)

| Catégorie            | Outils                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PDF (27)             | Modifier, fusionner, diviser, compresser, organiser, pivoter, extraire des pages, ajouter du texte, annoter, signer, filigrane (ajout, gestion), formulaires, extraire le texte, rechercher, PDF → images, images → PDF, recadrer, numéroter, protéger, déverrouiller, vérifier/réparer, métadonnées, extraire les liens, extraire les images, comparer, caviarder |
| Numérisation (3)     | Scanner un document (caméra), corriger un document photographié, OCR + PDF recherchable                                                                                                                                                                                                                                                                            |
| Images (7)           | Compresser, redimensionner, recadrer, convertir, pivoter/retourner, EXIF (lire/supprimer), filigrane — par lot                                                                                                                                                                                                                                                     |
| Texte (5)            | Compteur de mots, casse, nettoyage, comparaison, slug                                                                                                                                                                                                                                                                                                              |
| Développeur (10)     | JSON, CSV → JSON, Base64, URL, entités HTML, UUID, mots de passe, hash, regex, timestamp                                                                                                                                                                                                                                                                           |
| Calculatrices (4)    | Pourcentage, TVA, jours entre deux dates / jours ouvrés, unités                                                                                                                                                                                                                                                                                                    |
| Codes & couleurs (5) | QR code (générer, lire), codes-barres, convertisseur de couleurs + contraste WCAG, palette d'image                                                                                                                                                                                                                                                                 |
| Documents (5)        | Markdown → PDF, texte → PDF, feuilles à imprimer, calendrier, page de garde                                                                                                                                                                                                                                                                                        |

Le rapport détaillé de l'extension (outils, limites, licences, coûts, prochaines étapes) est dans
`docs/RAPPORT_EXTENSION.md` ; la matrice d'audit de qualité des 66 outils (tests par outil, risques, corrections)
dans `docs/AUDIT_QUALITE.md`.

## Architecture (résumé)

Voir `docs/ARCHITECTURE.md` pour le détail.

```
src/
  config/        marque (OUTILIA), env, limites, en-têtes de sécurité / CSP
  lib/tools/     registre d'outils typé (un fichier par domaine) = source unique (navigation, recherche, sitemap, SEO)
  lib/pdf/       opérations pdf-lib pures et testées, qpdf (chiffrement), annotations, coordonnées, couche pdf.js
  lib/ocr/       moteur Tesseract (chargement, pages, nettoyage), PDF recherchable, exports
  lib/scan/      géométrie (homographie), détection de coins, pipeline de page (filtres)
  lib/images/    canvas, opérations pixel, métadonnées EXIF/PNG, encodeur PNG, filigrane
  lib/text/, lib/dev/, lib/calc/, lib/codes/   bibliothèques pures des outils texte, développeur, calculs, codes
  lib/files/     validation (signatures), noms de fichiers sûrs, téléchargement
  lib/consent/   état de consentement first-party ; lib/analytics/ : événements sans données sensibles
  components/    ui, layout, tools (catalogue, page outil, renderer), pdf, scan, ocr, images, text, dev, calc, codes, documents
  app/           routes : / (catalogue), /[category]/, /[category]/[slug]/, guides, pages légales, sitemap, robots
```

### Registre d'outils

`src/lib/tools/registry/*.ts` (un fichier par domaine, assemblés dans `index.ts`) décrit chaque outil (id,
slug, catégorie, textes, SEO, statut, indexabilité, formats, limites, outils liés, contenu éditorial). Un
outil n'est public que si `status === "published"` ; une entrée `planned` servirait de feuille de route sans
générer de page. `validateRegistry()` (testé) vérifie l'unicité des ids/slugs/titres/descriptions, les
longueurs SEO et la complétude des entrées publiées. Ajouter un outil = une entrée dans le registre + un
composant dans `src/components/tools/tool-renderer.tsx` (chargé dynamiquement, client uniquement ; un
test statique vérifie que chaque outil publié a son composant).

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

### OCR et numérisation

- Tesseract.js 7 est exécuté dans un Web Worker avec le moteur WebAssembly auto-hébergé (`public/ocr/core`,
  variante SIMD / relaxed-SIMD choisie à l'exécution) et les modèles de langue `public/ocr/lang`
  (`fra.traineddata.gz` 6,3 Mo, `eng.traineddata.gz` 10,9 Mo). Rien n'est téléchargé depuis un CDN tiers.
  Mémoire : ≈ 50–100 Mo pour le moteur, plus la page rendue à 200 dpi.
- Le PDF recherchable (`src/lib/ocr/searchable-pdf.ts`) embarque l'image de la page et dessine chaque mot
  reconnu en texte invisible (`Tr 3`) à sa position, ce qui rend le document sélectionnable et indexable.
- Le scanner et la correction de perspective reposent sur une homographie calculée à partir de quatre
  coins (détectés par seuillage d'Otsu + plus grande composante claire, ou placés à la main) et sur des
  filtres pixel purs (document, niveaux de gris, noir et blanc, luminosité/contraste).

### Chiffrement PDF

Le chiffrement, le déverrouillage et la vérification utilisent qpdf compilé en WebAssembly
(`@neslinesli93/qpdf-wasm`, actif `public/qpdf/qpdf.wasm`). Les mots de passe ne quittent pas le
navigateur. La CSP autorise `'wasm-unsafe-eval'` (sans `'unsafe-eval'`) pour qpdf, Tesseract et les
décodeurs pdf.js.

### Confidentialité

Tout le traitement est local. Aucun endpoint serveur, aucun stockage, aucun log de contenu. Les URL
d'objets sont révoquées après usage, les documents pdf.js détruits au changement de fichier. Les
événements analytics (`src/lib/analytics/events.ts`) sont filtrés par liste blanche et ne contiennent jamais
de nom de fichier.

## Tests

- `pnpm test` : 186 tests Vitest (registre, sitemap, SEO, CSP, env, consentement, toutes les opérations PDF
  sur fixtures réelles, permissions de chiffrement relues par pdf.js, géométrie/détection du scanner, OCR →
  PDF recherchable, métadonnées d'images, encodeur PNG, extraction d'images et de liens, comparaison,
  caviardage (y compris pages pivotées), Markdown → PDF, regex, dates et jours fériés, TVA, unités,
  codes-barres, couleurs, décodage QR, documents imprimables, limites et fichiers invalides, fondations
  de l'éditeur : diagnostic d'import, mot de passe, couche OCR, plan de pages, passages OCR).
- `pnpm build && pnpm test:e2e` : 97 parcours Playwright exécutés sur desktop et mobile (Pixel 7) :
  catalogue, recherche, navigation, 404, métadonnées, sitemap/robots/CSP, thème, absence de débordement
  horizontal, et pour chacun des 66 outils un parcours avec fichiers téléchargés vérifiés (pdf-lib, pdf.js,
  en-têtes d'images, ZIP, EXIF), dont OCR sur image et sur PDF scanné, protection AES-128/256 et caviardage.
  Des suites dédiées vérifient la confidentialité (aucune requête hors origine ni avec corps, aucun stockage),
  l'accessibilité (axe-core, clavier, menu mobile, états annoncés), la caméra avec le périphérique factice de
  Chromium, les gros fichiers (60 Mo traité, 101 Mo et 1 001 pages refusés) et les replis de compatibilité
  (navigateur sans encodeur WebP, variantes SIMD du moteur OCR). Safari et Firefox ne sont pas exécutés : voir
  la procédure manuelle dans `docs/AUDIT_QUALITE.md`.

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
superposées), polices standard PDF uniquement (latin) pour tout texte généré, OCR limité au texte imprimé
net en français/anglais, pas de conversion Office, formats image HEIC/TIFF non lus, caviardage par
rastérisation des pages marquées, comparaison de PDF textuelle uniquement.

## Licence des dépendances

| Dépendance                                                                                                                | Licence                 |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Next.js, React, Radix UI, dnd-kit, sonner, next-themes, zod, pdf-lib, qrcode, exifr, marked, fflate, tailwind-merge, clsx | MIT                     |
| pdf.js (pdfjs-dist), tesseract.js, tesseract.js-core, modèles @tesseract.js-data, jsqr                                    | Apache-2.0              |
| @neslinesli93/qpdf-wasm                                                                                                   | ISC (qpdf : Apache-2.0) |
| diff                                                                                                                      | BSD-3-Clause            |
| dompurify                                                                                                                 | MPL-2.0 ou Apache-2.0   |
| lucide-react                                                                                                              | ISC                     |
| Polices Bricolage Grotesque, Instrument Sans, Caveat                                                                      | OFL-1.1                 |
| axe-core (développement uniquement, tests d'accessibilité)                                                                | MPL-2.0                 |
