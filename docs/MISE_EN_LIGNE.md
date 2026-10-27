# Mise en ligne : liste de contrôle

À faire **avant** de rendre le site public. Rien de ce qui suit n'est inventé par le code : les
valeurs absentes s'affichent « à compléter » sur les pages concernées.

## 1. Identité légale (obligatoire, LCEN art. 6-III)

Renseigner dans l'environnement de déploiement (jamais dans le dépôt) :

| Variable                                 | Contenu                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_NAME`       | Nom ou raison sociale de l'éditeur                           |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS`     | Forme juridique (auto-entrepreneur, SAS…) ou « particulier » |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS`    | Adresse du siège (ou de l'éditeur personne physique)         |
| `NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER`  | SIREN / SIRET / RCS (si entreprise)                          |
| `NEXT_PUBLIC_LEGAL_VAT_NUMBER`           | TVA intracommunautaire (si assujetti)                        |
| `NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR` | Directeur de la publication                                  |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`        | Adresse de contact (page Contact, confidentialité)           |
| `NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER`     | Hébergeur (ex. Vercel Inc.)                                  |
| `NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS`      | Adresse de l'hébergeur                                       |

Vérifier ensuite `/mentions-legales/`, `/confidentialite/`, `/contact/` : aucun encadré jaune
« à compléter » ne doit rester. Relire la politique de confidentialité au regard des choix réels
(analytics, publicité).

## 1 bis. Prévisualisation sans indexation

Tout déploiement qui n'est pas le site public (prévisualisation, recette) doit porter
`NEXT_PUBLIC_NOINDEX=true` : `robots.txt` passe en `Disallow: /`, chaque page reçoit
`<meta name="robots" content="noindex">` et l'en-tête `X-Robots-Tag: noindex, nofollow`, le
sitemap est vide. En production la variable doit être absente ou `false` : `pnpm check:launch`
bloque sinon.

## 2. Adresse publique

`NEXT_PUBLIC_SITE_URL=https://votre-domaine.fr` (sans barre finale). Elle alimente le canonical,
le sitemap, `robots.txt`, les balises Open Graph et les images de partage.

## 3. Mesure d'audience et publicité (facultatif)

- `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible` (+ `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`) ou `gtag`
  (+ `NEXT_PUBLIC_GA_MEASUREMENT_ID`). Rien n'est chargé avant consentement.
- Publicité : procédure complète dans `docs/MONETISATION_PUBLICITAIRE.md` (compte AdSense validé,
  CMP certifiée, `NEXT_PUBLIC_ADS_ENABLED=true`, fournisseur, identifiant éditeur, un identifiant de
  bloc par emplacement voulu) ; `pnpm check:launch` refuse une configuration incomplète.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` pour la Search Console.

## 4. Vérifications sur l'hébergement

- HTTPS obligatoire (la caméra du scanner est refusée en HTTP).
- En-têtes de sécurité : ils sont émis par Next (`src/config/security.ts`) ; vérifier qu'un CDN
  ne les écrase pas (`curl -I`).
- `/_next/static`, `/pdfjs`, `/ocr`, `/qpdf`, `/fonts` servis avec un cache long (immuables,
  nommés par version ou empreinte) ; `/sw.js` et `/offline-manifest.json` jamais mis en cache par un
  CDN (Next émet déjà `no-cache`), sinon les visiteurs garderaient un ancien service worker.
- Soumettre `/sitemap.xml` à la Search Console ; tester une page de partage (LinkedIn Post
  Inspector, X Card Validator) : l'image `opengraph-image` doit apparaître.

## 5. Avant chaque publication

`pnpm check` (typecheck, lint, tests, build) puis `pnpm test:e2e` ; la CI GitHub (`.github/workflows/ci.yml`)
exécute la même chose à chaque poussée. Procédure appareil réel : `docs/VALIDATION_APPAREIL_REEL.md`.
