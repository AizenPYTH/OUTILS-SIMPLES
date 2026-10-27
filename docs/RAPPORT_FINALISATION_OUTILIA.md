# Rapport de finalisation OUTILIA — validation pré-lancement

Date : 2026-10-27. Branche `claude/festive-turing-f4fmzh`, commit de départ de cette validation
`b4e62e8` (version anglaise + emplacements publicitaires), commit final : voir `git log`.
**Aucun déploiement n'a été effectué, aucune publicité n'est activée, aucune opération Git
destructive.** Les résultats historiques n'ont pas été réutilisés : chaque contrôle ci-dessous a été
réexécuté sur l'état final du dépôt.

## 1. Décision de lancement (synthèse)

**Lancement possible après les actions P0, toutes du ressort du propriétaire** (aucune ne concerne le
code) : identité légale et URL publique dans l'environnement de production, déploiement de
prévisualisation non indexé, contrôle sur appareils réels (iPhone Safari, Android, Firefox) des
parcours caméra/OCR/éditeur FR et EN. Le code est vert sur toutes les suites, l'audit de dépendances
est propre, le SEO international est vérifié page par page sur le build, les emplacements
publicitaires sont inertes et les mesures Lighthouse sont bonnes sur bureau et acceptables sur mobile
simulé (limitées par le travail JavaScript de React et des moteurs PDF).

| Priorité | Point                                                                                                                                                                                         | Responsable              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **P0**   | Renseigner `NEXT_PUBLIC_SITE_URL` et les 7 variables légales obligatoires (+ SIREN/TVA si entreprise) ; `pnpm check:launch` → 0 bloquant                                                      | Propriétaire             |
| **P0**   | Déployer une prévisualisation avec `NEXT_PUBLIC_NOINDEX=true`, vérifier en-têtes (CSP, HSTS, `X-Robots-Tag`), puis exécuter `docs/VALIDATION_APPAREIL_REEL.md` (§ 1–6) sur de vrais appareils | Propriétaire             |
| **P0**   | Choisir l'hébergeur et le domaine ; HTTPS obligatoire (caméra)                                                                                                                                | Propriétaire             |
| **P1**   | Relecture native des textes anglais (interface, SEO, pages légales de courtoisie)                                                                                                             | Propriétaire / relecteur |
| **P1**   | Mesurer les Core Web Vitals de terrain après lancement (Search Console) ; le TBT mobile simulé reste élevé sur les pages d'outils                                                             | Propriétaire             |
| **P1**   | Ajouter `pnpm audit --prod` à la routine avant chaque publication (non inclus dans `pnpm check`)                                                                                              | Propriétaire             |
| **P2**   | Titres rendus > 75 caractères sur 35 pages FR (suffixe « \| OUTILIA ») : à retravailler si la Search Console réécrit les titres                                                               | Éditorial                |
| **P2**   | Champs de formulaire dans le modificateur (`docs/ETUDE_FONCTIONNALITES_DIFFEREES.md`), monétisation (`docs/MONETISATION_ET_VIABILITE.md`, `docs/MONETISATION_PUBLICITAIRE.md`)                | Produit                  |

## 2. Commandes exécutées et résultats

| Commande                                                                          | Résultat                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status` / `git log`                                                          | branche `claude/festive-turing-f4fmzh`, arbre propre au départ, synchronisé avec `origin`                                                                                                                                                                       |
| `pnpm audit --prod`                                                               | 2 avis modérés (fflate 0.8.2, uuid 8.3.2 via exceljs) → corrigés (fflate 0.8.3, surcharge `uuid@<11.1.1`→11.1.1) → **« No known vulnerabilities found »**                                                                                                       |
| `pnpm typecheck`                                                                  | OK                                                                                                                                                                                                                                                              |
| `pnpm lint`                                                                       | OK (0 erreur, 0 avertissement)                                                                                                                                                                                                                                  |
| `pnpm format:check`                                                               | OK                                                                                                                                                                                                                                                              |
| `pnpm test` (Vitest)                                                              | 258 tests, 31 fichiers, 0 échec                                                                                                                                                                                                                                 |
| `pnpm build`                                                                      | OK (191 pages prérendues FR + EN, images OG, sitemap, routes d'images de partage)                                                                                                                                                                               |
| `pnpm test:e2e` (Playwright, Chromium desktop + Pixel 7)                          | 270 exécutions : 257 passées, 13 ignorées par conception, 0 échec (8,0 min). Après le dernier correctif (liens soulignés des pages légales, classe CSS seule), rebuild puis suites a11y, site, i18n, ads, privacy réexécutées : 52 passées, 8 ignorées, 0 échec |
| Lighthouse 13.5 (`pnpm dlx lighthouse`, Chromium Playwright)                      | exécuté sur 9 pages × (mobile, desktop) : voir § 5                                                                                                                                                                                                              |
| Sondage SEO HTTP des 191 URL du sitemap                                           | aucune anomalie structurelle (détail `docs/AUDIT_SEO_FINAL.md`)                                                                                                                                                                                                 |
| `pnpm check:launch` (sans variables / avec publicité incomplète / avec `NOINDEX`) | 8 bloquants explicites / 3 bloquants explicites / 1 bloquant ; messages en clair                                                                                                                                                                                |
| Mesure des bundles (script reproductible, `docs/AUDIT_PERFORMANCES.md` § 5)       | avant/après : § 5                                                                                                                                                                                                                                               |

Non exécutés et pourquoi : Safari, Firefox et appareils réels (non disponibles dans l'environnement :
procédure manuelle fournie) ; tests de charge ; mesure de terrain (site non publié).

## 3. Corrections apportées pendant cette validation

1. **Dépendances** : fflate 0.8.3 ; uuid 11.1.1 (surcharge pnpm) ; audit propre. Vérifié par les
   tests de conversion Excel → PDF et de compression par lot (ZIP).
2. **Performance / SEO** : le catalogue et les 18 pages de familles n'avaient **aucune carte d'outil
   dans le HTML** (rendu client forcé par `useSearchParams`) et un décalage de mise en page de 0,98 :
   corrigé (77 cartes rendues côté serveur, CLS 0, `/outils/` desktop 75 → 100).
3. **Performance EN** : messages anglais découpés (chrome à l'hydratation, outils avec le composant) :
   −41 Ko gzip sur chaque page anglaise (accueil EN 229 → 188 Ko).
4. **Mesure corrigée** : la hausse « 183 → 221 Ko » annoncée précédemment venait d'une méthode
   incluant le chunk de polyfills `noModule` ; à méthode égale, l'internationalisation a coûté +3 Ko
   sur l'accueil français (180 → 183 Ko), confirmé en reconstruisant le commit d'avant.
5. **Prévisualisation non indexable** : `NEXT_PUBLIC_NOINDEX=true` (robots `Disallow: /`, meta
   `noindex`, en-tête `X-Robots-Tag`, sitemap vide), refusé en production par `pnpm check:launch`.
6. **Accessibilité** : contraste du badge de compteur des familles (4,17 → conforme) ; Lighthouse
   accessibilité 100 sur toutes les pages mesurées.
7. **SEO** : quatre descriptions de familles raccourcies.
8. **Tests ajoutés** : parcours anglais complet (fusion + réouverture du PDF produit, état d'erreur
   traduit), repli hors ligne vers `/en/offline/`, contrôle `NOINDEX`, composants hydratés limités
   à la carte de messages partagée.

## 4. Tests : réussis, échoués, ignorés, non exécutés

| Suite                       | Réussis                 | Échoués | Ignorés                                                                         | Non exécutés                     |
| --------------------------- | ----------------------- | ------- | ------------------------------------------------------------------------------- | -------------------------------- |
| Vitest                      | 258                     | 0       | 0                                                                               | —                                |
| Playwright desktop + mobile | 257                     | 0       | 13 (caméra et hors ligne sur mobile, axe sur desktop seulement, par conception) | Safari, Firefox, appareils réels |
| Lighthouse                  | 18 audits (9 pages × 2) | —       | —                                                                               | pages restantes (même gabarit)   |

Parcours couverts par les tests automatisés : dépôt universel (détection PDF/image/Word/inconnu,
transfert vers l'outil), fusion et modification de PDF (export relu par pdf-lib/pdf.js), OCR (image et
PDF scanné, orientations), conversions Office (Word → PDF, Excel/CSV → PDF, PDF → Word), HEIC,
hors ligne FR et EN (outil enregistré puis exécuté sans réseau, repli), changement de langue sur page
équivalente, routes principales FR et EN, 404 par langue, publicité inerte, accessibilité (axe,
clavier), confidentialité (aucune requête hors origine, mot de passe jamais transmis), rendu mobile
(projet Pixel 7 sur toutes les suites).

## 5. Performance (mesures, pas d'estimation)

JS initial des navigateurs modernes (gzip) : accueil FR 183 Ko (180 avant la version anglaise),
accueil EN 188 Ko (229 avant cette mission), outil FR 173 Ko, outil EN 178 Ko (219 avant),
catalogue FR 228 Ko, catalogue EN 271 Ko (311 avant), guide 167 Ko, page légale 166 / 172 Ko.
Méthode, script et détail : `docs/AUDIT_PERFORMANCES.md`.

Lighthouse (build local, sans CDN) :

| Page                                 | Mobile (perf / a11y / BP / SEO · métriques)               | Desktop                                                   |
| ------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| `/`                                  | 90 / 100 / 100 / 100 · LCP 3.5 s · TBT 130 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 20 ms · CLS 0     |
| `/confidentialite/`                  | 91 / 96 / 100 / 100 · LCP 2.7 s · TBT 280 ms · CLS 0      | 100 / 96 / 100 / 100 · LCP 0.7 s · TBT 10 ms · CLS 0      |
| `/en/`                               | 88 / 100 / 100 / 100 · LCP 3.6 s · TBT 170 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.8 s · TBT 10 ms · CLS 0     |
| `/en/pdf/merge/`                     | 80 / 100 / 100 / 100 · LCP 3.0 s · TBT 540 ms · CLS 0.059 | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 40 ms · CLS 0.015 |
| `/en/tools/`                         | 81 / 100 / 100 / 100 · LCP 3.8 s · TBT 340 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 0 ms · CLS 0.005  |
| `/guides/comment-fusionner-des-pdf/` | 93 / 100 / 100 / 100 · LCP 2.9 s · TBT 170 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 0 ms · CLS 0      |
| `/outils/`                           | 87 / 100 / 100 / 100 · LCP 3.2 s · TBT 290 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.8 s · TBT 20 ms · CLS 0     |
| `/pdf/fusionner/`                    | 80 / 100 / 100 / 100 · LCP 3.3 s · TBT 490 ms · CLS 0.025 | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 20 ms · CLS 0.017 |
| `/pdf/modifier/`                     | 71 / 100 / 100 / 100 · LCP 3.3 s · TBT 800 ms · CLS 0.103 | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 50 ms · CLS 0.033 |

Lecture : accessibilité, bonnes pratiques et SEO à 100 partout (le 96 initial de `/confidentialite/`
venait de liens distingués par la couleur seule : soulignés depuis, 100 après remesure). Les scores
« performance » mobiles (71–93) sont limités par le temps de blocage sur CPU ralenti ×4 : React DOM et,
sur les pages d'outils, les moteurs PDF chargés dès l'hydratation ; le modificateur (`/pdf/modifier/`)
est le plus lourd (TBT 800 ms, CLS 0,10 à la limite). Mesures locales sans CDN ni Brotli ; les valeurs
de terrain sont à mesurer après lancement.

## 6. Sécurité et confidentialité

- Audit de dépendances propre (§ 2). Risques encore ouverts : `'unsafe-inline'` dans `script-src`
  (rendu statique sans nonce ; aucune injection HTML non assainie trouvée : JSON-LD interne,
  Markdown passé par DOMPurify, SVG échappé) ; dépendances à surveiller à chaque mise à jour.
- Appels réseau réels du code applicatif : `fetch` vers l'origine uniquement (`/heif/libheif.wasm`,
  `/fonts/*`, `/offline-manifest.json`, modèles OCR, assets `/_next`) ; `navigator.clipboard` pour
  le bouton Copier ; aucune requête tierce avec la configuration par défaut (CSP `connect-src 'self'`,
  vérifié par `e2e/privacy.spec.ts` et `e2e/ads.spec.ts`). Stockage : `localStorage` pour le thème et
  le consentement uniquement. Les affirmations de `/confidentialite/` et `/en/privacy/` correspondent
  au code.
- Publicité : désactivée par défaut, aucun script, aucun identifiant fictif (test), aucun emplacement
  dans le modificateur, les pages légales, hors ligne ou 404 ; activation refusée sans fournisseur,
  identifiant éditeur au bon format, bloc, et `NEXT_PUBLIC_CONSENT_MODE=external` (CMP certifiée).
  Le bandeau maison n'est pas présenté comme certifié.

## 7. Informations à fournir par le propriétaire avant publication

| Variable                                                                                                                                                          | Obligatoire                                        | Usage                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                                                                                                            | oui (https, domaine réel)                          | canonical, hreflang, sitemap, robots, Open Graph          |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_NAME`, `_PUBLISHER_STATUS`, `_PUBLISHER_ADDRESS`, `_PUBLICATION_DIRECTOR`, `_CONTACT_EMAIL`, `_HOSTING_PROVIDER`, `_HOSTING_ADDRESS` | oui                                                | mentions légales, confidentialité, contact (FR et EN)     |
| `NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER`, `_VAT_NUMBER`                                                                                                            | si entreprise / si assujetti                       | mentions légales                                          |
| `NEXT_PUBLIC_NOINDEX`                                                                                                                                             | absente en production ; `true` en prévisualisation | indexation                                                |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` (+ domaine ou identifiant), `NEXT_PUBLIC_CONSENT_MODE`                                                                           | facultatif                                         | mesure d'audience après consentement                      |
| `NEXT_PUBLIC_ADS_*`, `NEXT_PUBLIC_ADSENSE_*`                                                                                                                      | facultatif, désactivé                              | publicité (procédure `docs/MONETISATION_PUBLICITAIRE.md`) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`                                                                                                                            | facultatif                                         | Search Console                                            |

Aucune de ces valeurs n'a été inventée ni inscrite dans le dépôt.

## 8. Checklist exacte de publication

1. Environnement de production : variables du § 7 ; `pnpm check:launch` → « 0 bloquant ».
2. `pnpm install --frozen-lockfile && pnpm audit --prod && pnpm check && pnpm test:e2e` sur le commit
   candidat (CI verte).
3. Prévisualisation (`NEXT_PUBLIC_NOINDEX=true`) : `curl -I` (CSP, HSTS, `X-Robots-Tag: noindex`,
   `Cache-Control: no-cache` sur `/sw.js`), parcours `docs/VALIDATION_APPAREIL_REEL.md` FR et EN,
   validateur de partage (image OG) FR et EN.
4. Production : retirer `NEXT_PUBLIC_NOINDEX`, redéployer ; vérifier `/robots.txt`, `/sitemap.xml`
   (191 URL), absence de `X-Robots-Tag`, une page FR et une page EN (`lang`, canonical, hreflang).
5. Search Console : propriété, sitemap ; surveiller « Ciblage international » et les Core Web Vitals.
6. Retour arrière : `docs/PLAN_LANCEMENT.md` § 4.

## 9. Étapes manuelles sur appareils réels (non réalisées ici)

`docs/VALIDATION_APPAREIL_REEL.md` : scanner (caméra arrière, orientation EXIF, mémoire sur Android
d'entrée de gamme), lecteur QR, OCR, modificateur (tactile, zoom, export), Safari et Firefox desktop,
version anglaise (§ 6). Aucune de ces validations n'est revendiquée par ce rapport.
