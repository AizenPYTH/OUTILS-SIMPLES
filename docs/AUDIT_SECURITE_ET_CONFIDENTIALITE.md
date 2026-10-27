# Audit sécurité et confidentialité

Date : 2026-10-27. Périmètre : code du dépôt (branche `claude/festive-turing-f4fmzh`), en-têtes émis par
Next.js, service worker, stockage navigateur, bibliothèques tierces. Méthode : lecture du code,
`grep` systématiques, tests unitaires et Playwright existants (cités), sans scanner externe.

## 1. Promesse et périmètre réel

| Promesse affichée                                 | Constat dans le code                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Vos fichiers ne quittent pas votre navigateur » | Aucun gestionnaire de route (`route.ts`) ni action serveur dans `src/app` ; les seuls `fetch()` du code applicatif visent des fichiers statiques de l'origine (`/heif/libheif.wasm`, `/fonts/*`, `/offline-manifest.json`, modèles OCR). Le CSP `connect-src 'self'` interdit tout autre destinataire. Vérifié par `e2e/privacy.spec.ts` (fusion, compression, QR, OCR : aucune requête hors origine ni avec corps ; le mot de passe de protection n'apparaît dans aucune requête). |
| « Rien n'est stocké »                             | Stockage local limité au thème et aux choix de consentement (`localStorage`, clé `outilia-consent-v1`, sans identifiant). Le transfert accueil → outil garde le `File` en mémoire JavaScript (`src/lib/files/handoff.ts`, durée de vie 60 s, jamais sérialisé). Le service worker ne met en cache que des réponses `basic` de l'origine : pages, scripts, moteurs ; jamais une réponse à un fichier utilisateur (il n'y en a pas).                                                  |
| « Aucun service tiers sans consentement »         | `AnalyticsLoader` ne rend rien tant que `consent.analytics` n'est pas vrai ; `AdSlot` ne rend rien si `NEXT_PUBLIC_ADS_ENABLED` est faux et attend `consent.advertising`. Les hôtes tiers ne sont ajoutés au CSP que lorsque la variable correspondante est définie (`src/config/security.ts`). Par défaut (`none`/`false`) : aucun script tiers, aucun hôte tiers dans le CSP.                                                                                                     |

## 2. En-têtes de sécurité (`src/config/security.ts`, appliqués par `next.config.ts`)

- `Content-Security-Policy` : `default-src 'self'` ; `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` (pas d'`unsafe-eval` en production : vérifié par `tests/unit/security.test.ts`) ; `connect-src 'self'` ; `frame-src 'none'` ; `object-src 'none'` ; `frame-ancestors 'none'` ; `base-uri 'self'` ; `form-action 'self'` ; `worker-src 'self' blob:` ; `img-src 'self' blob: data:` ; `upgrade-insecure-requests`.
  - `'unsafe-inline'` pour les scripts est le compromis du rendu statique sans nonce (documenté dans le fichier). Risque résiduel : une injection HTML pourrait exécuter du script ; voir § 3 pour les points d'injection examinés.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Strict-Transport-Security` (production), `Permissions-Policy` : caméra pour l'origine seule (scanner, lecteur QR), micro/géolocalisation/paiement/USB refusés.
- `/sw.js` et `/offline-manifest.json` servis avec `Cache-Control: no-cache` (un CDN ne doit pas les figer).

## 3. Points d'injection HTML examinés (`dangerouslySetInnerHTML`)

| Fichier                                          | Contenu injecté                                                                        | Verdict                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/components/seo/json-ld.tsx`                 | JSON-LD construit par le code à partir du registre (pas d'entrée utilisateur)          | Sûr.                                              |
| `src/components/documents/markdown-pdf-tool.tsx` | Aperçu Markdown : `marked` puis `DOMPurify.sanitize` avant injection                   | Sûr (assainissement côté client avant insertion). |
| `src/components/codes/barcode-tool.tsx`          | SVG généré par `src/lib/codes/barcode.ts` ; le texte utilisateur passe par `escapeXml` | Sûr.                                              |

Aucun `innerHTML`/`insertAdjacentHTML` ailleurs. Les noms de fichiers produits passent par `sanitizeFilename`.

## 4. Caviardage et masque : sémantique distincte, affichée

- **Caviarder** (`pdf-redact`, `src/lib/pdf/operations/redact.ts`) : chaque page touchée est **remplacée par une image** rendue avec les zones noircies ; texte, vecteurs et annotations de ces pages disparaissent du fichier ; métadonnées Info/XMP supprimées par défaut. Limite assumée et écrite sur la page (FR et EN) : les pages traitées ne sont plus sélectionnables ni recherchables, le poids peut augmenter, l'outil ne devine pas ce qui est sensible. Vérifié par `tests/unit/audit-deep.test.ts` (texte absent du résultat, y compris pages pivotées).
- **Masque** du modificateur PDF : info-bulle explicite « masquer visuellement un contenu (les données restent dans le fichier : pour les supprimer, utilisez l'outil Caviarder) », traduite en anglais. Les conditions d'utilisation et la page de l'outil ne présentent jamais le masque comme une suppression.
- Signature : visuelle, jamais présentée comme signature électronique qualifiée (pages d'outil, CGU FR/EN).

## 5. Bibliothèques tierces et exécution

- pdf.js, pdf-lib, Tesseract.js, qpdf-wasm, libheif-js, mammoth, exceljs, docx, marked + DOMPurify, jsQR, exifr : toutes servies depuis l'origine (`public/pdfjs`, `/ocr`, `/qpdf`, `/heif`, bundles), aucun CDN tiers. WebAssembly autorisé par `'wasm-unsafe-eval'` uniquement.
- Workers (pdf.js, OCR) : `worker-src 'self' blob:` ; les messages d'erreur produits dans un worker sont traduits à l'affichage (`tr(error.message)`), aucune donnée n'y transite vers l'extérieur.
- Versions épinglées dans `package.json`. **`pnpm audit --prod` exécuté le 2026-10-27** (registre joignable) :
  deux avis « modéré » trouvés, tous deux corrigés, puis « No known vulnerabilities found ».
  - `fflate` 0.8.2 (GHSA-px8p-9vwx-vf98, boucle infinie d'`unzipSync` sur une archive ZIP64 malformée) :
    le site n'utilise que `zipSync`/`zlibSync` (création d'archives et de PNG), jamais la
    décompression ; non exploitable, mais mis à jour vers 0.8.3 (correctif mineur, tests inchangés).
  - `uuid` 8.3.2 via `exceljs` (GHSA-w5hq-g745-h8pq, absence de contrôle de borne dans v3/v5/v6 avec
    tampon fourni) : exceljs ne sert qu'à lire des classeurs dans le navigateur et n'appelle pas ces
    fonctions avec un tampon externe ; non applicable. Résolu par une surcharge pnpm
    (`uuid@<11.1.1` → 11.1.1), vérifiée par les tests de conversion Excel → PDF (unitaires et
    Playwright).

## 6. Analytique et publicité (préparées, désactivées)

- Événements analytiques : noms fixes, propriétés filtrées par liste blanche (`tool`, `option`, …), jamais de nom de fichier ni de contenu (`src/lib/analytics/events.ts`, test « drops any property outside the allow-list »).
- Consentement : bandeau maison (`NEXT_PUBLIC_CONSENT_MODE=builtin`) ou plateforme externe (`external`). **Le bandeau maison n'est pas présenté comme une plateforme de gestion du consentement certifiée** : pour AdSense en Union européenne, une CMP certifiée IAB TCF est exigée par Google (voir `docs/MONETISATION_ET_VIABILITE.md`).
- Service worker : seules les réponses `basic` (même origine) sont mises en cache ; un script publicitaire ou analytique (origine tierce) n'est jamais mis en cache, et les requêtes hors origine ne passent pas par le SW (`if (url.origin !== self.location.origin) return`).

## 7. Points à surveiller / recommandations

| Priorité | Point                               | Action                                                                                                                                                                                          |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | `'unsafe-inline'` dans `script-src` | Acceptable pour un site statique sans entrée HTML non assainie ; passer à un nonce imposerait un rendu dynamique par requête. Réévaluer si des contenus tiers (commentaires, CMS) apparaissent. |
| P1       | Dépendances                         | Exécuter `pnpm audit --prod` et mettre à jour avant mise en ligne ; renouveler à chaque mise à jour de pdf.js/Tesseract.                                                                        |
| P2       | Page 404                            | Rendu client après coquille Next ; `noindex` et statut 404 corrects. Aucun impact sécurité.                                                                                                     |
| P2       | Mode hors ligne                     | Les pages visitées restent en cache sur l'appareil (pas les documents) : indiqué sur `/hors-ligne/` et `/en/offline/` ; sur appareil partagé, conseiller de vider le site.                      |
| P2       | Caméra                              | Flux `getUserMedia` traité localement, jamais enregistré ; la permission est demandée à l'usage et révocable.                                                                                   |

Aucune vulnérabilité exploitable n'a été identifiée dans le périmètre examiné. Aucun identifiant, clé ou information légale n'a été ajouté au dépôt.
