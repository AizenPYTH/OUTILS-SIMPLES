# Mise en ligne : liste de contrôle

À faire **avant** de rendre le site public. Rien de ce qui suit n'est inventé par le code : les
valeurs absentes s'affichent « à compléter » sur les pages concernées.

## 1. Identité légale (obligatoire, LCEN art. 1-1)

Lancement par un particulier, sans publicité, sur Vercel : suivre d'abord
`docs/LANCEMENT_SANS_PUBLICITE.md` (choix du type d'éditeur, hébergeur, questions juridiques).

Renseigner dans l'environnement de déploiement (jamais dans le dépôt) :

| Variable                                 | Contenu                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_KIND`       | `individual` (particulier), `company` ou `anonymous`         |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_NAME`       | Nom ou raison sociale de l'éditeur                           |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS`     | Forme juridique (auto-entrepreneur, SAS…) ou « particulier » |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS`    | Adresse du siège (ou de l'éditeur personne physique)         |
| `NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER`  | SIREN / SIRET / RCS (si entreprise)                          |
| `NEXT_PUBLIC_LEGAL_VAT_NUMBER`           | TVA intracommunautaire (si assujetti)                        |
| `NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR` | Directeur de la publication                                  |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`        | Adresse de contact (page Contact, confidentialité)           |
| `NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER`     | Hébergeur (ex. Vercel Inc.)                                  |
| `NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS`      | Adresse de l'hébergeur                                       |
| `NEXT_PUBLIC_LEGAL_HOSTING_PHONE`        | Téléphone de l'hébergeur (art. 1-1, I, 4°)                   |

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
le sitemap, `robots.txt`, les balises Open Graph et les images de partage. **Sans elle, le build
produit des canoniques en `http://localhost:3000`** : en production, la commande de build de
l'hébergeur doit donc être `pnpm check:launch && pnpm build`, pour qu'un environnement incomplet
échoue au lieu de publier. Sur une prévisualisation Vercel (`VERCEL_ENV=preview`), la même
commande exige `NEXT_PUBLIC_NOINDEX=true` et ne fait qu'avertir pour l'identité. `pnpm check:launch` refuse aussi les adresses en `http`, `localhost` et
les noms réservés aux exemples (`example.com/.org/.net`, `.example`, `.test`, `.invalid`,
`.localhost`).

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

`pnpm audit --prod`, `pnpm check` (typecheck, lint, tests, build) puis `pnpm test:e2e` ; la CI
GitHub (`.github/workflows/ci.yml`) exécute les tests à chaque poussée (`pnpm audit --prod` n'y
est pas : à lancer à la main). Procédure appareil réel : `docs/VALIDATION_APPAREIL_REEL.md`.

## 6. Contrôles après déploiement (prévisualisation puis production)

Remplacer `https://DOMAINE` par l'adresse réelle du déploiement.

| Contrôle                         | Commande ou geste                                                                        | Attendu en prévisualisation (`NEXT_PUBLIC_NOINDEX=true`) | Attendu en production                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `robots.txt`                     | `curl -s https://DOMAINE/robots.txt`                                                     | `Disallow: /`                                            | `Allow: /`, `Host` et `Sitemap` sur le bon domaine                               |
| Sitemap                          | `curl -s https://DOMAINE/sitemap.xml \| grep -c "<loc>"`                                 | `0`                                                      | `191` (98 FR, 93 EN au 2026-10-28)                                               |
| En-tête d'indexation             | `curl -sI https://DOMAINE/ \| grep -i x-robots-tag`                                      | `X-Robots-Tag: noindex, nofollow`                        | aucune ligne                                                                     |
| Balise robots (accueil FR et EN) | `curl -s https://DOMAINE/ \| grep -o '<meta name="robots"[^>]*>'` (idem `/en/`)          | `noindex, nofollow`                                      | `index, follow`                                                                  |
| Canonique et langues             | `curl -s https://DOMAINE/pdf/fusionner/ \| grep -oE 'rel="(canonical\|alternate)"[^>]*'` | canonique sur le domaine de prévisualisation             | canonique `https://DOMAINE/pdf/fusionner/`, alternates `fr`, `en`, `x-default`   |
| Publicité                        | `curl -s https://DOMAINE/ \| grep -cE "adsbygoogle\|googlesyndication"`                  | `0`                                                      | `0` tant que la publicité n'est pas activée selon `MONETISATION_PUBLICITAIRE.md` |
| En-têtes de sécurité             | `curl -sI https://DOMAINE/ \| grep -iE "content-security-policy\|strict-transport"`      | présents                                                 | présents                                                                         |
| Service worker                   | `curl -sI https://DOMAINE/sw.js \| grep -i cache-control`                                | `no-cache`                                               | `no-cache`                                                                       |
