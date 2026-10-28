# Rapport de finalisation OUTILIA — validation technique de lancement

Date : 2026-10-28. Branche `claude/festive-turing-f4fmzh`. Point de départ de cette mission : commit
`8e3cc68` (présent dans l'historique, ainsi que tous les commits précédents ; arbre propre et
synchronisé avec `origin` au départ). Commit final : voir `git log`.
**Aucun déploiement n'a été effectué, rien n'a été publié, aucune publicité n'est activée, aucune
information légale n'a été inventée, aucune opération Git destructive.** Chaque résultat ci-dessous a
été remesuré sur l'état final du dépôt ; les résultats des rapports précédents n'ont pas été repris
sans contrôle.

## 1. Décision de lancement

**Le code est prêt pour la validation finale. La publication reste conditionnée aux actions P0 du
propriétaire (§7), dont aucune ne concerne le code.**

Arguments :

- Toutes les suites passent sur le build final : typecheck, lint, formatage, 268 tests unitaires,
  316 exécutions Playwright (303 passées, 13 ignorées par conception, 0 échec), audit des
  dépendances sans vulnérabilité connue.
- Les trois derniers sauts de mise en page signalés (QR code, regex, UUID) sont corrigés et
  mesurés (§3), sans hausse du JavaScript initial et sans erreur d'hydratation.
- La configuration de prévisualisation est non indexable sur les 193 pages (un défaut corrigé sur les
  deux accueils, §4) ; le build de type production expose 191 URL cohérentes (canoniques, langues,
  hreflang réciproques), sans code publicitaire.
- `pnpm check:launch` bloque toute mise en production sans identité légale ni adresse publique
  réelle (renforcé : noms de domaine réservés refusés).
- Ce qui ne peut pas être vérifié ici (appareils réels, Safari, Firefox, mesures de terrain) est
  décrit dans une procédure courte avec critères bloquants (`docs/VALIDATION_APPAREIL_REEL.md`).
  **Elle n'a pas été exécutée** : c'est la dernière condition avant publication.

## 2. Commandes exécutées et résultats (état final)

| Commande                                                                   | Résultat                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status`, `git log`, `git fetch`                                       | arbre propre au départ, 0 commit d'écart avec `origin`, `8e3cc68` et ses prédécesseurs présents                                                                                                                                        |
| `pnpm audit --prod`                                                        | « No known vulnerabilities found »                                                                                                                                                                                                     |
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check`                       | OK / OK (0 erreur, 0 avertissement) / OK                                                                                                                                                                                               |
| `pnpm test` (Vitest)                                                       | 268 tests, 32 fichiers, 0 échec                                                                                                                                                                                                        |
| `pnpm build` (sans variables, comme la CI)                                 | OK                                                                                                                                                                                                                                     |
| `pnpm test:e2e` (Chromium bureau + Pixel 7)                                | 316 exécutions : 303 passées, 13 ignorées par conception, 0 échec (11,3 min)                                                                                                                                                           |
| Build prévisualisation (`NEXT_PUBLIC_NOINDEX=true`, URL réservée de test)  | robots `Disallow: /`, sitemap vide, `X-Robots-Tag: noindex, nofollow` et balise `noindex` sur les 193 pages                                                                                                                            |
| Build de type production (URL réservée de test, valeur non conservée)      | 191 URL (98 FR, 93 EN), canonique = URL sur toutes, `lang` correct, `index, follow`, 186 pages à hreflang réciproques + 5 guides français sans version anglaise (fr + x-default, voulu), 0 en-tête `X-Robots-Tag`, 0 code publicitaire |
| `pnpm check:launch`                                                        | sans variables : 8 bloquants, exit 1 ; prévisualisation : 9 bloquants (dont `NOINDEX`), exit 1 ; publicité incomplète : 4 bloquants ; `--warn` (CI) : exit 0                                                                           |
| Lighthouse 13.6 mobile, limitation réelle (`--throttling-method=devtools`) | voir §3 et §5                                                                                                                                                                                                                          |

**Non exécutés** : Safari, Firefox et appareils réels (absents de l'environnement) ; mesures de
terrain (site non publié) ; tests de charge (site statique sans serveur applicatif).

## 3. Les trois sauts de mise en page (CLS)

**Reproduction.** Sur le build de production, Lighthouse en limitation simulée (méthode par défaut)
donnait des CLS instables (0,306 puis 0 sur la même page) : la limitation simulée ne ralentit pas
réellement le chargement. Mesure reproductible retenue : Lighthouse mobile en **limitation réelle**
(`--throttling-method=devtools`, CPU ×4, réseau lent), 3 passages, et un script Playwright
(CPU ×4 et 4G lente émulés via le protocole Chrome) qui relève le CLS et le moment où l'outil
apparaît puis devient utilisable.

**Cause.** Les trois outils n'étaient rendus que dans le navigateur. Un squelette de 256 px occupait
leur place jusqu'à leur chargement (3,7 à 4,5 s), puis l'outil réel (467 à 1 156 px sur mobile)
poussait la section « À propos » vers le bas (élément décalé identifié dans la trace).

**Solutions essayées et écartées (mesurées).**

1. `next/dynamic` avec rendu serveur et le chargeur paresseux existant : CLS **en hausse**
   (0,64–0,96). Le squelette restait dans le HTML statique, l'outil arrivait dans un bloc différé du
   flux React permuté après le premier affichage, et la mise à jour d'un parent pendant
   l'hydratation faisait réapparaître le squelette.
2. Import direct depuis la page d'outil : CLS corrigé, mais JavaScript initial **+105 Ko gzip sur les
   69 pages d'outils** (174 → 279 Ko), la route étant partagée. Écarté.

**Solution retenue.** Rendu serveur par `next/dynamic` avec un import direct par outil et par langue
(`src/components/tools/server-rendered-tools.tsx`, `src/components/tools/ssr/`) : HTML complet sans
squelette ni bloc différé, code toujours découpé par page, textes anglais chargés avant
l'hydratation uniquement sur les trois pages anglaises. La zone de l'outil est `inert` jusqu'à
l'hydratation : aucune saisie ne peut être perdue. Le générateur d'UUID affiche le **format** v4
(`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`, aucune valeur) jusqu'à l'hydratation : produire des UUID
côté serveur servirait les mêmes à tous les visiteurs, et une liste vide repoussait le LCP à 5,1 s.
Les libellés du testeur de regex étaient traduits au chargement du module (une seule évaluation
côté serveur pour toutes les langues) : ils le sont désormais au rendu.

**Mesures (médianes de 3 passages, mobile ; entre crochets : minimum–maximum).**

| Outil           | Lighthouse avant (CLS · LCP · perf) | Lighthouse après    | Outil visible avant → après | Utilisable après | CLS Playwright avant → après |
| --------------- | ----------------------------------- | ------------------- | --------------------------- | ---------------- | ---------------------------- |
| QR code         | 0,326 · 2,06 s · 66                 | 0,001 · 2,07 s · 81 | 3,81 s → 1,24 s             | 3,20 s           | 0,339 → 0,001                |
| Testeur regex   | 0,201 · 2,06 s · 74                 | 0,002 · 2,20 s · 80 | 4,12 s → 1,19 s             | 3,24 s           | 0,232 → 0,028 [0,002–0,110]  |
| Générateur UUID | 0,079 · 2,10 s · 78                 | 0,003 · 2,06 s · 83 | 4,05 s → 1,18 s             | 3,16 s           | 0,089 → 0,003                |

JavaScript (gzip, navigateurs modernes) : initial **inchangé** (174 Ko FR, 179 Ko EN) ; total après
chargement inchangé à 1 Ko près ; pages non concernées (ex. TVA) inchangées. Aucune erreur ni
avertissement d'hydratation (FR et EN, bureau et mobile).

**Compromis documentés.**

- L'outil est **visible avant d'être utilisable** (≈ 2 s sur un téléphone lent émulé) : un toucher
  pendant cet intervalle est sans effet (choix de sûreté : pas de saisie perdue). Avant, rien
  n'était visible pendant ≈ 4 s.
- Le décalage résiduel du testeur de regex (0,028 en médiane, 0,110 au pire sur 3 passages
  Playwright ; 0,002 sous Lighthouse) vient du **remplacement des polices web**, présent sur toutes
  les pages du site (accueil 0,024, TVA 0,017), pas de l'outil.
- Sur les visites suivantes, contrôlées par le service worker, Chromium affiche un avertissement
  « preload … not used » pour 5 fichiers de ces pages : ils sont demandés deux fois mais **servis
  par le cache du service worker (0 octet réseau)**. Sans effet pratique.

## 4. Autres corrections de cette mission

| Point                                                                                                                                                                  | Correction                                                                                                                                                                                                  | Vérification                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Prévisualisation : les deux accueils gardaient `<meta name="robots" content="index, follow">` avec `NEXT_PUBLIC_NOINDEX=true` (l'en-tête `X-Robots-Tag` était correct) | Les métadonnées racines suivent `NEXT_PUBLIC_NOINDEX`                                                                                                                                                       | Test unitaire ; 193 pages contrôlées sur le build de prévisualisation |
| `check:launch` acceptait des domaines réservés aux exemples (`example.org`, `.test`…)                                                                                  | Refus de `example.com/.org/.net`, `.example`, `.test`, `.invalid`, `.localhost`                                                                                                                             | Test unitaire (6 cas)                                                 |
| L'exemple par défaut de l'outil Markdown → PDF citait un domaine `outilia.fr` dont la propriété n'est établie nulle part                                               | Remplacé par le domaine de documentation `example.org` (FR et EN)                                                                                                                                           | Tests i18n                                                            |
| Checklists de mise en ligne incomplètes                                                                                                                                | `docs/MISE_EN_LIGNE.md` §6 (contrôles `curl` prévisualisation/production), commande de build `pnpm check:launch && pnpm build`, `pnpm audit --prod` avant publication ; `docs/PLAN_LANCEMENT.md` mis à jour | —                                                                     |
| Procédure sur appareils réels                                                                                                                                          | `docs/VALIDATION_APPAREIL_REEL.md` réécrite : 14 contrôles FR/EN, résultats attendus, critères bloquants, preuves ; 33 URL vérifiées (200)                                                                  | —                                                                     |

**Finitions P3** (`docs/AUDIT_DESIGN.md` §7.5) : aucune finition rapide, visible et sans risque
restante. Les descriptions coupées des cartes (C4) ont été mesurées : 69/69 coupées ; passer à 3
lignes sur bureau et 2 sur mobile en laissait encore 39 et 65 coupées pour +1 600 px de page mobile,
donc non retenu. C'est un travail éditorial (descriptions de carte d'environ 65 caractères), qui
peut attendre le lancement. Le titre de l'OCR sur deux lignes (S2) relève aussi d'une décision
éditoriale et SEO. Les autres P3 n'affectent pas la compréhension.

## 5. Performance (Lighthouse mobile, limitation réelle, build livré, 1 passage)

| Page                            | perf / a11y | LCP    | TBT      | CLS   |
| ------------------------------- | ----------- | ------ | -------- | ----- |
| `/`                             | 84 / 100    | 2,09 s | 525 ms   | 0     |
| `/codes/generateur-qr-code/`    | 82 / 100    | 2,12 s | 586 ms   | 0,001 |
| `/developpeur/testeur-regex/`   | 78 / 100    | 2,27 s | 801 ms   | 0,002 |
| `/developpeur/generateur-uuid/` | 77 / 100    | 2,09 s | 870 ms   | 0,003 |
| `/calculatrices/tva/`           | 77 / 100    | 1,99 s | 832 ms   | 0     |
| `/pdf/modifier/`                | 70 / 100    | 2,15 s | 1 209 ms | 0,082 |

Le score mobile reste limité par le temps de blocage (React et, sur les outils, les moteurs PDF) ;
les valeurs varient de quelques points d'un passage à l'autre (§3 : médianes). Mesures de la
validation précédente (limitation simulée, 2026-10-27), pour mémoire :

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

## 6. Risques encore ouverts

| Risque                                                                                                                                             | Niveau                  | Traitement                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Aucun test sur appareil réel, Safari ou Firefox                                                                                                    | élevé tant que non fait | `docs/VALIDATION_APPAREIL_REEL.md`, avant publication (P0)                                           |
| Temps de blocage mobile élevé sur les pages d'outils (TBT 0,5–1,2 s en limitation réelle)                                                          | moyen                   | Mesurer les Core Web Vitals de terrain après lancement ; pistes dans `docs/AUDIT_PERFORMANCES.md` §4 |
| CLS du modificateur PDF à 0,082 en limitation réelle (sous le seuil de 0,1, mais proche) ; décalage dû aux polices web ≈ 0,02 sur toutes les pages | faible                  | À suivre dans la Search Console ; ne pas ajouter de contenu au-dessus de la zone de dépôt            |
| Outils QR, regex, UUID : ≈ 2 s visibles mais inactifs sur téléphone lent                                                                           | faible                  | Contrôle 2.11 de la procédure appareil réel                                                          |
| `'unsafe-inline'` dans la CSP (rendu statique sans nonce)                                                                                          | faible                  | Aucune injection trouvée ; à revoir si du contenu utilisateur est un jour rendu côté serveur         |
| Textes anglais non relus par un anglophone                                                                                                         | moyen                   | Relecture native (P1)                                                                                |
| Descriptions de cartes coupées, titres > 75 caractères sur 35 pages FR                                                                             | faible                  | Lot éditorial après lancement                                                                        |

## 7. Actions obligatoires du propriétaire (dans l'ordre)

| Priorité | Action                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Choisir l'hébergeur et le domaine définitif ; HTTPS obligatoire.                                                                                                                       |
| **P0**   | Renseigner dans l'environnement de production `NEXT_PUBLIC_SITE_URL` et les 7 variables légales (+ SIREN/TVA si entreprise) — jamais dans le dépôt ; `pnpm check:launch` → 0 bloquant. |
| **P0**   | Configurer la commande de build de production : `pnpm check:launch && pnpm build`.                                                                                                     |
| **P0**   | Déployer une prévisualisation avec `NEXT_PUBLIC_NOINDEX=true` et dérouler `docs/MISE_EN_LIGNE.md` §6 (colonne prévisualisation).                                                       |
| **P0**   | Dérouler `docs/VALIDATION_APPAREIL_REEL.md` sur iPhone/Safari, Android/Chrome et Firefox, FR et EN ; corriger tout KO bloquant avant publication ; conserver les preuves.              |
| **P0**   | Relire les pages légales FR et EN avec les vraies valeurs (aucun encadré « à compléter »).                                                                                             |
| P1       | Avant chaque publication : `pnpm audit --prod`, `pnpm check`, `pnpm test:e2e`.                                                                                                         |
| P1       | Relecture native des textes anglais.                                                                                                                                                   |
| P1       | Après publication : retirer `NEXT_PUBLIC_NOINDEX`, dérouler `docs/MISE_EN_LIGNE.md` §6 (colonne production), Search Console (sitemap, ciblage international, Core Web Vitals).         |
| P2       | Publicité : seulement selon `docs/MONETISATION_PUBLICITAIRE.md` (CMP certifiée) ; elle reste désactivée par défaut.                                                                    |

## 8. Vérifications qui nécessitent de vrais appareils

Toutes celles de `docs/VALIDATION_APPAREIL_REEL.md` §2 : navigation et changement de langue,
dépôt/traitement/téléchargement, messages d'erreur, compression, modificateur PDF (tactile, rotation,
export), OCR (temps par page, mémoire), scanner et caméra, conversions et HEIC, confidentialité
(onglet Réseau), hors ligne (mode avion), outils rendus côté serveur, pages légales, thème sombre et
zoom du système, lecteurs d'écran (VoiceOver, TalkBack, NVDA). **Aucune n'est revendiquée comme
faite par ce rapport.**

## 9. Sécurité et confidentialité (vérifié le 2026-10-27, inchangé)

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

## 10. Variables à fournir par le propriétaire

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
