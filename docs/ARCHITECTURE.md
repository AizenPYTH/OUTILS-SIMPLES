# Architecture OUTILIA

## Composants majeurs

```
┌──────────────────────────── Next.js 16 (App Router, SSG) ────────────────────────────┐
│ app/(site)/page.tsx            catalogue (ToolCatalog client : recherche + filtres)   │
│ app/(site)/[category]/         page catégorie (seulement si ≥ 1 outil publié)         │
│ app/(site)/[category]/[slug]/  page outil : ToolPageLayout (serveur) + ToolRenderer   │
│ app/(site)/guides/*            articles éditoriaux (src/lib/content/guides.ts)        │
│ app/(site)/{légal}             pages avec placeholders explicites                     │
│ app/sitemap.ts, robots.ts      générés depuis le registre                              │
└───────────────────────────────────────────────────────────────────────────────────────┘
             │ importe                                  │ charge dynamiquement (client)
             ▼                                          ▼
┌──────── src/lib/tools ──────────────┐    ┌──────── src/components ───────────────────────┐
│ registry/  pdf-core, pdf-extra,     │    │ tools/tool-renderer.tsx  id → composant       │
│            scan, images, text,      │    │   (next/dynamic, ssr:false, un bundle/outil)  │
│            developer, calculators,  │    │ tools/shared  dropzone générique, text-io,    │
│            codes, documents         │    │               panels, copy/download           │
│ queries.ts (publiés, liés…)         │    │ pdf/  shared, tools (27), workspace (éditeur) │
│ search.ts  (accents, synonymes)     │    │ scan/ ocr/ images/ text/ dev/ calc/ codes/    │
│ categories.ts (9, 8 actives)        │    │ documents/                                    │
└─────────────────────────────────────┘    └──────────────────────┬────────────────────────┘
                                                                  │ appelle des bibliothèques pures
                                                                  ▼
┌──────── src/lib ─────────────────────────────────────────────────────────────────────────┐
│ pdf/   load, operations (merge, pages, annotate, watermark, compress, forms, extract-text,│
│        crop, stamps, metadata, images-to-pdf, links, extract-images, compare, redact,    │
│        text-to-pdf, printables), qpdf.ts (WebAssembly), annotations/, browser/ (pdf.js)  │
│ ocr/   engine (Tesseract worker), searchable-pdf, export                                 │
│ scan/  geometry (homographie), detect (coins), page-pipeline (filtres), detect-browser    │
│ images/ canvas, pixels (Otsu, document, palette), metadata (EXIF/PNG), png-encode,       │
│        watermark, types                                                                  │
│ text/  stats, transform, diff · dev/ json, csv, encoding, random, regex, timestamp        │
│ calc/  percent (+ TVA), dates (fériés, ouvrés), units · codes/ qr, qr-read, barcode, color│
│ files/ validation, filename, download, format · consent/ · analytics/ · i18n/ · seo       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Règle d'organisation : toute logique métier vit dans `src/lib` sous forme de fonctions pures (octets →
octets, texte → texte, pixels → pixels) testables en Node ; les composants n'ajoutent que l'état
d'interface, le canvas et les téléchargements. Les bibliothèques lourdes (pdf.js, pdf-lib, Tesseract,
qpdf, exifr, marked, jsqr, dnd-kit) sont importées dynamiquement par outil.

## Flux de données d'un outil

1. `PdfDropzone` pré-valide (taille, type déclaré) → `readPdfFile` lit les octets et vérifie `%PDF`.
2. `usePdfDocument` ouvre le document avec pdf.js (vignettes, tailles, rotations) et conserve les octets.
3. L'utilisateur configure l'opération (plages validées par `parsePageRanges`, vignettes, options).
4. `useOperation` exécute la fonction pure de `src/lib/pdf/operations` avec rapport de progression ;
   les erreurs sont converties en `PdfError` (message français, code, récupérable ou non).
5. `DonePanel` propose le téléchargement : `bytesToBlob` → `triggerDownload` (URL révoquée ensuite).
6. `reset()` détruit le document pdf.js et libère les références.

Aucune étape ne quitte le navigateur. Les Web Workers sont utilisés par pdf.js (rendu) et Tesseract
(OCR) ; les opérations pdf-lib et les filtres d'image s'exécutent sur le thread principal avec des
rendez-vous (`setTimeout`) pour laisser l'interface peindre. Déplacer pdf-lib dans un worker est une
amélioration prévue (voir limitations).

Variantes du flux pour les autres familles :

- **Images** : `ImageBatchTool` + `useImageBatch` (liste, aperçus, traitement séquentiel annulable,
  ZIP) reçoivent un `BatchProcessor` pur (bitmap → blob) propre à chaque outil.
- **Texte / développeur / calculatrices** : état local + fonction pure recalculée à chaque frappe
  (`useMemo`), sortie dans `TextOutputPanel` (copie, téléchargement).
- **Scanner / perspective** : `ImageBitmap` conservé en mémoire par page, réglages (`ScanPageSettings`)
  appliqués par `renderScanPage` pour l'aperçu (taille réduite) et l'export (taille plafonnée).
- **OCR** : rendu de la page à 200 dpi (pdf.js) ou image ≤ 3000 px → Tesseract (worker) → texte éditable
  par page → exports TXT/Markdown ou PDF recherchable (`buildSearchablePdf`).
- **Caviardage** : rectangles stockés en points visuels (échelle 1, rotation appliquée) ; à l'export, les
  pages marquées sont rendues à 150–300 dpi, noircies sur le canvas, encodées puis substituées dans le
  document (`replacePagesWithImages`), métadonnées supprimées.
- **Documents générés** (Markdown, texte, feuilles, calendriers, page de garde) : mise en page
  entièrement en pdf-lib avec les 14 polices standard, pagination et liens cliquables (`Link` annots).

## Éditeur / annotations

- Le modèle `Annotation` stocke tout en **espace utilisateur PDF** (points, origine en bas à gauche).
- L'overlay convertit avec la matrice `viewport.transform` fournie par pdf.js (`coordinates.ts`),
  donc le dessin à l'écran et l'export utilisent exactement la même transformation, zoom et rotation compris.
- `drawAnnotations` (pdf-lib) place texte et images avec `rotate` sur les pages pivotées en calculant
  l'ancre visuelle ; les chemins/formes sont convertis point par point.
- Import (`hooks/use-pdf-document.ts`) : lecture → ouverture pdf.js (progression pour les gros
  fichiers) → mot de passe demandé si `PdfPasswordError` (vérifié par pdf.js, déchiffrement local
  qpdf, réouverture des octets déchiffrés) → diagnostic `browser/diagnose.ts` (texte natif / scanné /
  mixte / vide, par page, couche OCR existante détectée) quand l'outil le demande (`analyse`).
- Espace de travail (`workspace/annotation-workspace.tsx`) en quatre zones : en-tête compact
  (`editor-header.tsx`), rail d'outils par intention (`toolbar.tsx`, `TOOL_GROUPS`), page centrée,
  panneau des pages repliable (`pages-panel.tsx`, dnd-kit) ; panneaux latéraux un à la fois
  (`side-panel.tsx` : OCR, document, historique, raccourcis) ; carte de diagnostic à l'import
  (`import-diagnosis.tsx`).
- Zoom (`lib/pdf/editor/zoom.ts`, pur et testé) : une seule source de vérité, l'échelle absolue en
  px CSS par point (100 % = 96/72) ; modes « ajuster à la largeur / page » dérivés du conteneur,
  zoom manuel figé ; molette avec Ctrl ancrée sur le point sous le curseur (`anchoredScroll`) via
  un ajustement du défilement après le rendu ; conteneur `min-w-full` pour ne jamais rogner.
- Objets (`overlay.tsx`) : test de collision précis (distance au trait pour lignes et dessins),
  outils « un tir » qui rendent la main à la sélection, poignées d'angle (texte : échelle de la
  police) et d'extrémité (lignes), double-clic = édition d'un texte, outil Texte sur un texte
  existant = édition ; la saisie est « live » et devient une seule étape d'historique à la fermeture.
- Propriétés (`floating-bar.tsx`) : barre flottante près de l'objet, placée au-dessus ou en dessous
  et bornée dans la zone ; chaque réglage modifie l'objet (étapes coalescées par contrôle) ; la
  barre du haut (`context-bar.tsx`) ne montre que le style par défaut de l'outil actif.
- Polices (`lib/pdf/fonts.ts`, `fonts-embed.ts`, `public/fonts`) : 3 polices standard + 9 familles
  libres incorporées par fontkit (sous-ensemble) ; mêmes fichiers chargés à l'écran (FontFace) ;
  contrôle des glyphes par police ; licences dans `public/fonts/LICENSES.md`.
- Recherche (`lib/pdf/browser/search.ts`) : items de texte pdf.js, sans casse ni accents ;
  remplacement d'un passage par le mécanisme « Modifier le texte » (`extract-runs` + `apply`).
- Historique (`use-editor-history.ts`) : un seul réducteur `past/present/future` pour les annotations,
  les textes modifiés et le plan de pages ; un glissement = une étape, nouvelle action = redo vidé ;
  clé de coalescence pour les curseurs et couleurs.
- Document de base : l'original, ou l'original + couche OCR (`use-editor-ocr.ts` : rendu de chaque page
  en pixels, moteur Tesseract, `addOcrLayer`) ; l'original n'est jamais modifié, la couche se retire.
- Plan de pages (`operations/page-plan.ts`) : ordre, rotation, duplication, suppression décrits et
  appliqués à l'export seulement ; annotations et textes restent indexés par page d'origine.
- Export (`export-dialog.tsx`) : textes modifiés → `applyAnnotations` → `applyPagePlan` → réouverture
  pdf.js (nombre de pages vérifié) ; les annotations sont aplaties dans le contenu (pas d'objets
  `/Annot` natifs), ce qui est écrit dans le dialogue et sur les pages concernées.

## Édition du texte existant

`src/lib/pdf/content/tokenizer.ts` (tokenizer de flux de contenu avec plages d'octets, pur),
`src/lib/pdf/text-edit/extract-runs.ts` (rejoue la liste d'opérateurs pdf.js pour localiser chaque
opérateur de texte de la page et reconstituer la table caractère → code de sa police),
`src/lib/pdf/text-edit/apply.ts` (remplace l'opérateur en place avec pdf-lib : police d'origine si
possible, sinon police standard pour ce seul passage), `src/components/pdf/workspace/text-edit-layer.tsx`
(couche cliquable + champ en place). L'aperçu est rendu à partir du document réellement modifié.
Détails et limites : `docs/EDITION_TEXTE.md`.

## OCR

`src/lib/ocr/engine.ts` (Tesseract.js, passes par orientation, fusion), `orientation.ts` (rotations,
inclinaison, direction par baseline, inverse des boîtes, colonnes), `preprocess.ts` (copie de travail),
`searchable-pdf.ts` (couche invisible dans le sens du texte). Les tests Node utilisent le moteur réel
avec les fichiers de `public/ocr/lang` et des images synthétiques (`@napi-rs/canvas`, dépendance de
développement). Détails : `docs/OCR_ORIENTATIONS.md`.

## Frontières de sécurité

- **CSP statique** (`src/config/security.ts`) : `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `worker-src 'self' blob:`, `img-src 'self' blob: data:` (la caméra est
  affichée via `srcObject`, sans directive `media-src` supplémentaire). `script-src` contient `'unsafe-inline'` (hydratation Next.js en
  rendu statique) et `'wasm-unsafe-eval'` (WebAssembly : Tesseract, qpdf, décodeurs pdf.js) mais jamais
  `'unsafe-eval'`. Nous avons privilégié des pages statiques (coût, cache CDN, SEO) à une CSP à nonce qui
  imposerait un rendu dynamique de chaque page. Les hôtes publicitaires / analytics ne sont ajoutés que
  lorsque la fonctionnalité est activée.
- **qpdf** : la glue Emscripten ignore `print`/`printErr` ; le wrapper (`src/lib/pdf/qpdf.ts`) capture
  `console.log`/`console.error` pendant `callMain` (synchrone) pour récupérer les messages dans le navigateur,
  et complète par des heuristiques sur les octets (`/Encrypt`, `/Linearized`, en-tête de version) qui
  fonctionnent aussi dans Node.
- **Actifs WebAssembly et modèles** : copiés depuis `node_modules` dans `public/` par
  `scripts/copy-pdfjs-assets.mjs` (`postinstall`, `prebuild`) et servis par le site lui-même ; aucun CDN
  tiers n'est contacté. `fs` et `path` sont aliasés vers un module vide pour la glue Emscripten de qpdf
  (`next.config.ts`).
- **Caméra** : `getUserMedia` demandé uniquement au clic, flux arrêté à la fermeture du dialogue ; les
  photos ne sont jamais envoyées. L'en-tête `Permissions-Policy` autorise `camera=(self)` (le scanner et le
  lecteur de QR en dépendent) et interdit microphone, géolocalisation, paiement et USB.
- Autres en-têtes : HSTS (prod), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP.
- Fichiers : vérification de signature (`%PDF`, PNG, JPEG), limites de taille/nombre/pages
  (`src/config/limits.ts`), noms de fichiers assainis, aucun `eval`, contenu jamais exécuté.
- Pas d'API serveur : pas de CSRF ni de limitation de débit nécessaires aujourd'hui. Toute future route
  serveur devra vivre sous `/api/` (déjà `disallow` dans robots) avec ses propres contrôles.
- JSON-LD sérialisé avec `<` échappé.

## Conversions Office

- `src/lib/conversion/docx.ts` : .docx → HTML sémantique (mammoth, chargé à la demande) →
  Markdown (`html-to-markdown.ts`, analyseur sans DOM : titres, styles, liens, listes imbriquées,
  tableaux, images en data URI) → `textToPdf`. Le moteur `text-to-pdf.ts` incorpore désormais les
  images PNG/JPEG en data URI (pré-incorporation asynchrone avant la mise en page synchrone) et
  accepte l'orientation paysage.
- `src/lib/conversion/sheet.ts` : .xlsx (exceljs) ou CSV (`parseCsv`) → tableaux de chaînes
  (`cellText` : résultats de formules, dates, texte enrichi, formats de nombre approximés, espaces
  fines remplacées pour les polices standard) → Markdown GFM (une section par feuille) → PDF.
- `src/lib/conversion/pdf-to-docx.ts` : items texte pdf.js (position, taille, nom de police) →
  lignes → paragraphes (`itemsToParagraphs` : écarts verticaux, changements de taille, titres par
  ratio à la taille médiane, centrage approximatif, gras/italique d'après le nom de police) →
  `docx` (Paragraph/TextRun/ImageRun/PageBreak), images reprises via `extractImages`. Pages sans
  texte (scans) : image conservée, avertissement OCR.
- Tous les avertissements sont remontés à l'interface (`warnings`) : rien n'est abandonné en
  silence.

## Mode hors ligne

- `src/sw/service-worker.js` : source du worker ; `scripts/build-sw.mjs` injecte une version (paquet,
  commit, horodatage) et une clé d'actifs (versions de pdf.js, Tesseract, qpdf) puis écrit `public/sw.js`
  et `public/offline-manifest.json` (fichiers et poids par groupe `pdf`, `ocr`, `fonts`). Les deux sont
  servis avec `Cache-Control: no-cache` (`next.config.ts`).
- Caches : `outilia-static-v1` (`/_next/static`, permanent, 600 entrées max), `outilia-assets-<clé>`
  (moteurs), `outilia-shell-<version>` (pages HTML, page hors ligne, manifeste). Les anciens caches sont
  supprimés à l'activation. Les requêtes RSC (`?_rsc=`) et tout ce qui n'est pas GET même origine passent
  au réseau sans interception ; hors ligne, Next replie une navigation client vers un chargement complet,
  servi par le worker.
- Côté page : `src/lib/offline/client.ts` (enregistrement, `collectPageAssets()` à partir des scripts et
  des entrées `performance`, dialogue par `MessageChannel` : `CHECK_URLS`, `CACHE_URLS` avec progression,
  `LIST_PAGES`, `FORGET_PAGE`), `src/lib/offline/needs.ts` (groupes par outil), `OfflineControl`
  (page d'outil), `ServiceWorkerRegistration` (bandeau hors connexion, enregistrement en production
  seulement), page `/hors-ligne/` (liste des outils enregistrés, limites).

## Architecture SEO

- Métadonnées uniques par page (`src/lib/seo.ts`), canonical construit depuis `NEXT_PUBLIC_SITE_URL`
  (jamais depuis les en-têtes de requête), `trailingSlash: true` pour des URL stables.
- `robots` : `index,follow` seulement si `status === "published" && indexable` ; sinon `noindex`.
- Sitemap : accueil, catégories actives, outils indexables, guides, pages légales. Les outils `planned`
  n'existent pas en tant que pages (404).
- Données structurées : `WebSite` (+ SearchAction), `WebApplication` par outil, `FAQPage` quand une FAQ
  existe, `BreadcrumbList`, `Article` pour les guides. Aucune note ni avis.
- Contenu : chaque page outil a un H1 unique, description, étapes, limites, confidentialité, FAQ, outils
  liés et guides, tous issus du registre (pas de boilerplate dupliqué).
- Performance : pdf.js / pdf-lib / dnd-kit chargés uniquement sur les pages outil (`next/dynamic`,
  `ssr: false`), polices auto-hébergées avec `font-display: swap`, images inexistantes (SVG inline).

## Points d'intégration monétisation

| Élément                    | Fichier                                                                   | État                                                                                             |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Emplacements publicitaires | `components/monetization/ad-slot.tsx`                                     | Rendu nul tant que `NEXT_PUBLIC_ADS_ENABLED` ≠ `true` ; réserve l'espace ; exige le consentement |
| Consentement               | `lib/consent/store.ts`, `components/monetization/consent-*.tsx`           | Bannière first-party ; mode `external` prévu pour une CMP certifiée                              |
| Analytics                  | `lib/analytics/events.ts`, `components/monetization/analytics-loader.tsx` | Plausible ou GA4, chargé après consentement, propriétés en liste blanche                         |
| Premium                    | `config/limits.ts`, champs `premium`/`featureFlags` du registre           | Architecture seulement : pas de compte ni de paiement                                            |

### Premium (conception future)

Si des fonctionnalités payantes sont ajoutées : prestataire de paiement (Stripe Checkout), vérification des
abonnements côté serveur par webhook signé, base de données minimale (utilisateurs, abonnements) via une
couche d'accès isolée, et un contexte client « entitlements » lu depuis le serveur, jamais depuis le
navigateur seul. Les outils liraient leurs limites via `getLimits(entitlements)` au lieu de `pdfLimits`.

## Internationalisation

Les chaînes d'interface sont centralisées dans `src/lib/i18n/fr.ts` (typé `Dictionary`), le contenu outil
dans le registre. Ajouter l'anglais = un dictionnaire `en.ts` de même forme, un registre de contenu
traduit, un préfixe de route `/en/` et les balises `hreflang` dans `buildPageMetadata`.
