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
┌──────── src/lib/tools ────────┐          ┌──────── src/components/pdf ────────────┐
│ registry.ts  (source unique)  │          │ tool-renderer.tsx  id → composant      │
│ queries.ts   (publiés, liés…) │          │ shared/  dropzone, panels, vignettes    │
│ search.ts    (accents, synon.)│          │ tools/   13 outils                      │
│ categories.ts                 │          │ workspace/ éditeur plein écran          │
└───────────────────────────────┘          └────────────────┬───────────────────────┘
                                                            │ appelle
                                                            ▼
┌──────── src/lib/pdf ──────────────────────────────────────────────────────────────┐
│ load.ts        chargement validé (signature, chiffrement, pages)                  │
│ operations/    merge, pages (extract/split/rotate/organize), annotate, watermark, │
│                compress, forms — pures, testées en Node                            │
│ annotations/   modèle en espace PDF + export pdf-lib                               │
│ coordinates.ts écran ⇄ viewport ⇄ PDF (même matrice que pdf.js)                    │
│ browser/       pdf.js (rendu), réencodeur canvas, lecture fichiers, ZIP            │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Flux de données d'un outil

1. `PdfDropzone` pré-valide (taille, type déclaré) → `readPdfFile` lit les octets et vérifie `%PDF`.
2. `usePdfDocument` ouvre le document avec pdf.js (vignettes, tailles, rotations) et conserve les octets.
3. L'utilisateur configure l'opération (plages validées par `parsePageRanges`, vignettes, options).
4. `useOperation` exécute la fonction pure de `src/lib/pdf/operations` avec rapport de progression ;
   les erreurs sont converties en `PdfError` (message français, code, récupérable ou non).
5. `DonePanel` propose le téléchargement : `bytesToBlob` → `triggerDownload` (URL révoquée ensuite).
6. `reset()` détruit le document pdf.js et libère les références.

Aucune étape ne quitte le navigateur. Les Web Workers sont utilisés par pdf.js pour le rendu ; les
opérations pdf-lib s'exécutent sur le thread principal avec des rendez-vous (`setTimeout`) pour laisser
l'interface peindre. Déplacer pdf-lib dans un worker est une amélioration prévue (voir limitations).

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
  `frame-ancestors 'none'`, `worker-src 'self' blob:`, `img-src 'self' blob: data:`. `'unsafe-inline'` est
  requis par les scripts d'hydratation Next.js en rendu statique ; nous avons privilégié des pages
  statiques (coût, cache CDN, SEO) à une CSP à nonce qui imposerait un rendu dynamique de chaque page.
  Les hôtes publicitaires / analytics ne sont ajoutés que lorsque la fonctionnalité est activée.
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
