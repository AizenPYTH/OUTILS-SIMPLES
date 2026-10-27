# Monétisation publicitaire : emplacements préparés, désactivés par défaut

Date : 2026-10-27. État : **aucune publicité réelle n'est activée, aucun compte AdSense n'existe
dans le dépôt, aucun déploiement n'a été effectué.** Ce document décrit l'infrastructure prête à
être connectée le jour où le propriétaire décidera de monétiser.

## 1. Architecture

| Élément                   | Fichier                                                          | Rôle                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration centrale    | `src/config/ads.ts`                                              | Liste des emplacements logiques, taille réservée, variable d'environnement de chaque emplacement, `resolveAdsConfig()` (activation, fournisseur, aperçu)                                                                                                                                                              |
| Variables d'environnement | `src/config/env.ts`, `.env.example`                              | Validation au chargement, valeurs par défaut sûres                                                                                                                                                                                                                                                                    |
| Composant                 | `src/components/monetization/ad-slot.tsx`                        | `<AdSlot placement="…" />` : rendu nul tant que l'emplacement n'est pas actif **et** que le visiteur n'a pas consenti ; sinon réserve l'espace, libellé « Publicité » / « Advertisement », charge le script du fournisseur **depuis ce composant seulement** (jamais depuis un layout) ; mode aperçu de développement |
| Consentement              | `src/lib/consent/*`, `src/components/monetization/consent-*.tsx` | Bannière maison (`builtin`) ou plateforme externe (`external`) ; `consent.advertising` conditionne tout chargement                                                                                                                                                                                                    |
| CSP                       | `src/config/security.ts`                                         | Les hôtes Google ne sont ajoutés aux directives que si `NEXT_PUBLIC_ADS_ENABLED=true`                                                                                                                                                                                                                                 |
| Service worker            | `src/sw/service-worker.js`                                       | Ne traite que l'origine du site : un script publicitaire n'est jamais mis en cache                                                                                                                                                                                                                                    |
| Contrôle de lancement     | `scripts/check-launch-env.mjs`                                   | Refuse une configuration publicitaire incomplète ou sans CMP certifiée                                                                                                                                                                                                                                                |
| Tests                     | `tests/unit/ads.test.ts`, `e2e/ads.spec.ts`                      | Désactivation par défaut, aperçu impossible en production, aucun identifiant fictif, aucun appel réseau, modificateur accessible                                                                                                                                                                                      |

Principe : **une page décide où un emplacement peut apparaître ; la configuration décide s'il
apparaît.** Sans configuration, les composants `AdSlot` ne rendent rien (pas d'espace vide, pas de
script, pas de requête).

## 2. Emplacements

| Identifiant logique | Pages                                        | Position                                                                                  | Taille réservée | Variable                                     |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------- | -------------------------------------------- |
| `home-after-intro`  | accueil FR/EN                                | après la section d'accueil (dépôt de fichier, recherche et raccourcis restent en premier) | 728 × 90        | `NEXT_PUBLIC_ADSENSE_SLOT_HOME_AFTER_INTRO`  |
| `tool-after-intro`  | pages d'outils                               | sous la zone de travail, avant « À propos » (jamais au-dessus du dépôt de fichier)        | 728 × 90        | `NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_INTRO`  |
| `tool-after-result` | pages d'outils                               | fin de la colonne principale, après FAQ et guides                                         | 336 × 280       | `NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT` |
| `guide-inline`      | guides d'au moins trois sections             | après la deuxième section                                                                 | 728 × 90        | `NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_INLINE`      |
| `guide-end`         | guides                                       | après les outils liés                                                                     | 336 × 280       | `NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END`         |
| `category-inline`   | pages de familles (pas le catalogue complet) | après la liste des outils                                                                 | 728 × 90        | `NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE`   |

Chaque emplacement s'active individuellement (sa variable vide = emplacement éteint). Aucun
emplacement sur : modificateur PDF (zone de travail), pages légales, confidentialité, contact,
cookies, hors ligne, 404, erreurs. Les identifiants ci-dessus sont des **noms logiques**, pas des
identifiants AdSense.

## 3. Variables d'environnement

| Variable                     | Défaut    | Rôle                                                     |
| ---------------------------- | --------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_ADS_ENABLED`    | `false`   | Interrupteur général                                     |
| `NEXT_PUBLIC_ADS_PROVIDER`   | `none`    | `none` ou `adsense`                                      |
| `NEXT_PUBLIC_ADS_PREVIEW`    | `false`   | Aperçu de développement (ignoré en build de production)  |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | vide      | Identifiant éditeur `ca-pub-…` du compte réel            |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | vide      | Identifiant du bloc AdSense de chaque emplacement        |
| `NEXT_PUBLIC_CONSENT_MODE`   | `builtin` | `external` obligatoire avec la publicité (CMP certifiée) |

Aucune de ces variables ne contient de valeur dans le dépôt.

## 4. Aperçu de développement

`NEXT_PUBLIC_ADS_PREVIEW=true pnpm dev` affiche, à chaque emplacement, un cadre hachuré marqué
« Aperçu d'emplacement publicitaire (simulation) » avec le nom logique et la taille réservée. Aucun
script, aucune requête, rien de cliquable ; `resolveAdsConfig()` force `preview=false` quand
`NODE_ENV=production`, ce que vérifie `tests/unit/ads.test.ts`. Il sert à contrôler la disposition
sur l'accueil, une page d'outil, une famille et un guide, en français et en anglais, sur mobile,
tablette et ordinateur.

## 5. Procédure d'activation future (dans l'ordre)

1. **Préalables** : site en ligne sur son domaine définitif, identité légale complète
   (`pnpm check:launch` à 0 bloquant), politique de confidentialité et page cookies relues.
2. **Compte AdSense** : créer le compte avec le domaine, ajouter le site, laisser Google vérifier
   la propriété (balise ou fichier) et **valider le site** (délai variable, contenu et trafic réels
   exigés). Publier `public/ads.txt` avec la ligne fournie par AdSense.
3. **Consentement** : choisir une plateforme de gestion du consentement certifiée par Google (IAB
   TCF v2.2) pour le trafic EEE/Royaume-Uni/Suisse ; `NEXT_PUBLIC_CONSENT_MODE=external` et
   intégration dans `src/components/monetization/consent-banner.tsx` (point prévu). La bannière
   maison **n'est pas** une solution suffisante pour la publicité personnalisée en Europe.
4. **Blocs** : créer dans AdSense un bloc par emplacement voulu (display, responsive) ; relever
   l'identifiant éditeur et les identifiants de bloc.
5. **Configuration** (environnement de production, jamais dans le dépôt) :
   `NEXT_PUBLIC_ADS_ENABLED=true`, `NEXT_PUBLIC_ADS_PROVIDER=adsense`, `NEXT_PUBLIC_ADSENSE_CLIENT`,
   puis seulement les `NEXT_PUBLIC_ADSENSE_SLOT_*` des emplacements choisis (commencer par un ou
   deux, par exemple `tool-after-result` et `guide-end`).
6. **Vérifications avant publication** : `pnpm check:launch` (0 bloquant), `pnpm check`,
   `pnpm test:e2e` ; sur une prévisualisation : la bannière de consentement s'affiche, aucun script
   Google avant accord, l'espace réservé apparaît après accord, le dépôt de fichiers et le
   modificateur restent utilisables, pas de décalage de mise en page sensible (CLS), affichage
   mobile/tablette/ordinateur, pages FR et EN.
7. **Mise en ligne**, puis surveillance : Core Web Vitals, taux d'erreur des outils, revenus.

Informations à récupérer dans le compte réel : identifiant éditeur, identifiants de blocs, contenu
d'`ads.txt`, statut de validation du site, paramètres de personnalisation des annonces.

## 6. Confidentialité et consentement

- Aucun contenu de fichier, nom, chemin, texte OCR ou résultat n'est jamais transmis : les
  emplacements ne reçoivent que l'identifiant éditeur et l'identifiant de bloc ; les événements
  analytiques restent filtrés par liste blanche.
- Rien n'est chargé sans `consent.advertising`. Le refus = rendu nul (pas d'espace vide).
- Le mode hors ligne ignore les origines tierces ; un script publicitaire n'est jamais mis en cache.
- Les textes de confidentialité décrivent la publicité comme **possible et désactivée** ; ils seront
  à mettre à jour (FR et EN) lors de l'activation réelle.

## 7. Performance

- Désactivé : aucune bibliothèque chargée. Mesure sur le build (JS initial gzip, scripts référencés
  par le HTML) avant/après cette mission : accueil FR 221 → **HOME_FR** Ko, outil FR 214 → **TOOL_FR** Ko,
  accueil EN 266 → **HOME_EN** Ko, catalogue FR 266 → **CAT_FR** Ko.
- Activé : le script AdSense (~ 200 Ko) est chargé en `lazyOnload` après consentement, depuis le
  composant ; compromis attendus à l'activation : requêtes tierces, légère variation de CLS malgré
  l'espace réservé (hauteur des annonces responsive), à mesurer sur la prévisualisation.

## 8. Tests

- `pnpm vitest run tests/unit/ads.test.ts` : configuration par défaut inactive ; activation par
  emplacement ; aperçu impossible en production ; aucun identifiant fictif ni script hors du
  composant ; service worker même origine ; composant : rendu nul (défaut, sans consentement),
  aperçu non cliquable, espace réservé et libellé une fois autorisé.
- `pnpm exec playwright test e2e/ads.spec.ts` : aucune trace publicitaire sur 13 pages FR/EN
  (dont légales et 404), aucune requête vers les domaines publicitaires, dépôt du modificateur
  accessible. Les suites existantes couvrent la mise en page, le hors ligne et les outils.
- Avant activation réelle : rejouer ces suites avec la configuration de production (hors
  identifiants), puis les vérifications manuelles du § 5.

## 9. Désactivation immédiate

`NEXT_PUBLIC_ADS_ENABLED=false` puis redéploiement (quelques minutes) : tous les emplacements
disparaissent, les hôtes Google sortent de la CSP, la bannière de consentement n'est plus requise si
aucune mesure d'audience n'est configurée. Aucune donnée n'est à purger côté site (rien n'est stocké).

## 10. Ce qui reste à vérifier avec la documentation officielle

L'accès à `support.google.com` n'était pas possible depuis l'environnement de travail. Avant
activation, vérifier dans l'aide AdSense : le format exact du script (`adsbygoogle.js?client=…`,
`crossorigin="anonymous"`), les règles de placement (nombre d'annonces, proximité des commandes),
l'obligation de CMP certifiée pour l'EEE, le fichier `ads.txt`, et les options « annonces
automatiques » (non utilisées ici : seuls des blocs manuels aux emplacements prévus).
