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
- Historique : réducteur `past/present/future`, un glissement = une étape, nouvelle action = redo vidé.
- Export : `applyAnnotations` → nouveau PDF ; les annotations sont aplaties dans le contenu (pas d'objets
  `/Annot` natifs), ce qui est documenté sur les pages concernées.

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
