# Suites de l'audit : ce qui a été fait, comment c'est vérifié, ce qui reste

Ce rapport fait suite à `docs/AUDIT_SITE_ET_CONCURRENCE.md` et aux priorités retenues : mise en
ligne, hors ligne, conversions Office, compléments du modificateur, visibilité, accueil et poids du
JavaScript. Chaque point indique ce qui a été livré, la preuve (tests, mesures) et les limites.
Rien ici n'a été déployé en production ; aucune configuration sensible n'a été modifiée.

## 1. Mise en ligne (priorité 1)

| Action                                   | État | Preuve                                                                                                                                                                    |
| ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Images de partage (Open Graph / Twitter) | Fait | `opengraph-image.tsx` pour l'accueil, les 9 familles, les 69 outils et les guides ; cartes `summary_large_image` ; images générées au build (1200 × 630, Liberation Sans) |
| Intégration continue                     | Fait | `.github/workflows/ci.yml` : typecheck, lint, format, tests unitaires, build, Playwright desktop + Pixel 7                                                                |
| Identité légale                          | Fait | variables `NEXT_PUBLIC_LEGAL_*` (jamais inventées, « à compléter » sinon), `docs/MISE_EN_LIGNE.md`                                                                        |
| Formatage uniforme                       | Fait | `pnpm format:check` passe sur tout le dépôt (122 fichiers reformatés, sans changement de comportement)                                                                    |

Reste à faire par l'éditeur du site : renseigner les variables légales, l'URL publique, soumettre le
sitemap, tester une carte de partage sur un réseau social réel.

## 2. Hors ligne (priorité 2)

Livré : service worker versionné (statiques à empreinte en cache permanent, moteurs en cache-first
versionné par les versions de pdf.js / Tesseract / qpdf / libheif, pages en réseau d'abord avec
repli), « Utiliser hors ligne » sur chaque page d'outil (poids annoncé : PDF 4,7 Mo, OCR 17 Mo,
polices 4,2 Mo), bandeau hors connexion, page `/hors-ligne/` avec la liste des outils enregistrés et
les limites réelles.

Preuve : `e2e/offline.spec.ts` (outil enregistré, réseau coupé par Playwright, fusion de deux PDF
hors ligne vérifiée sur le fichier téléchargé, lien client hors ligne, repli vers la page hors
connexion), `tests/unit/offline.test.ts` (manifeste : fichiers existants, poids, pas de fichier de
licence).

Limites assumées : première visite en ligne obligatoire ; OCR anglais, polices autres que Liberation
et tables CMap enregistrés seulement à l'usage ; éviction possible par le navigateur ; non testé sur
un iPhone réel (Safari limite la durée de conservation).

## 3. Conversions Office (priorité 3)

| Outil                     | Méthode                                                                                               | Limites annoncées sur la page                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Word (.docx) → PDF        | mammoth (HTML sémantique) → Markdown → moteur text-to-pdf (images PNG/JPEG incorporées)               | une colonne, polices standard, pas d'en-têtes/pieds/notes, tableaux à colonnes égales, EMF/WMF ignorés |
| Excel (.xlsx) / CSV → PDF | exceljs, une section par feuille, résultats de formules, dates                                        | colonnes égales, pas de couleurs ni de graphiques, 5 000 lignes par feuille                            |
| PDF → Word (.docx)        | items pdf.js → lignes → paragraphes (titres, gras, italique), images reprises, une page Word par page | colonnes et tableaux non reconstruits, scans = images seulement (OCR d'abord)                          |

Preuve : `tests/unit/conversion.test.ts` (13 tests sur fixtures synthétiques, PDF relus par pdf.js,
.docx dézippés et inspectés), `e2e/conversion.spec.ts` (4 parcours, téléchargements vérifiés).
PowerPoint et PDF/A ne sont volontairement pas proposés (la page d'accueil le dit quand un .pptx est
déposé).

## 4. Compléments du modificateur et des outils (priorité 4)

| Demande                          | État         | Détail                                                                                                                                                                   |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Photos HEIC                      | Fait         | décodage libheif (WebAssembly) dans `decodeImage` : tous les outils images ; testé sur un vrai fichier HEIC (unitaire et Playwright)                                     |
| Insérer les pages d'un autre PDF | Fait         | bouton « Insérer un PDF » du panneau des pages ; pages ajoutées à la fin du document puis placées après la page courante ; export vérifié dans l'ordre (test Playwright) |
| Comparaison visuelle             | Fait         | mode « Visuel » de Comparer deux PDF : rendu pixel par pixel, différences en rouge, résumé toutes pages                                                                  |
| Traitement par lots (PDF)        | Fait         | onglet « Plusieurs fichiers » de Compresser un PDF : jusqu'à 30 fichiers, ZIP ou un par un                                                                               |
| En-têtes, pieds, numéros         | Déjà présent | outil « Numéroter les pages » (en-tête/pied, {page}/{total}/{date}/{file})                                                                                               |
| Création de champs de formulaire | Non fait     | voir § Reste à faire                                                                                                                                                     |

## 5. Visibilité (priorité 5)

- FAQ ajoutée aux 36 outils qui n'en avaient pas (`src/lib/tools/registry/faq-additions.ts`,
  2 questions chacune, répondant à une limite réelle) ; JSON-LD FAQPage généré automatiquement.
- 4 guides nouveaux (Word → PDF sans logiciel, scanner avec son téléphone, hors connexion, OCR d'un
  scan), soit 9 guides.
- Page `/verifiez-le/` : trois vérifications reproductibles (onglet Réseau, mode avion, code open
  source), liée depuis l'accueil et le pied de page.
- Aucune promesse de trafic : ces pages donnent au moteur de recherche du contenu utile et distinct,
  rien de plus.

## 6. Accueil et JavaScript initial

Accueil : zone de dépôt universelle avec détection locale du type, outils proposés (modificateur en
premier pour un PDF), fichier transmis à l'outil choisi ; capture réelle du modificateur ; quatre
raccourcis ; page raccourcie (parcours fusionnés dans l'en-tête).

JavaScript initial (scripts référencés par le HTML, gzip, build de production, mesuré avec Playwright) :

| Page                     | Avant l'audit | Après lot 1 | Après l'accueil refait |
| ------------------------ | ------------- | ----------- | ---------------------- |
| Accueil                  | ≈ 249 Ko      | 172 Ko      | 183 Ko                 |
| Page d'outil (fusionner) | ≈ 254 Ko      | 178 Ko      | 176 Ko                 |
| Page de contenu (légale) | ≈ 248 Ko      | 171 Ko      | 167 Ko                 |

L'objectif « < 150 Ko » n'est pas atteint : React DOM (70 Ko) et l'exécution Next (≈ 60 Ko) forment
un plancher d'environ 135 Ko ; le reste (≈ 35 Ko) est le code applicatif du gabarit (en-tête,
recherche, dictionnaire, utilitaires de classes). Gains obtenus : registre retiré du bundle commun,
validation de l'environnement sans bibliothèque, consentement et analytics importés seulement si
configurés, dialogue de recherche, tiroir mobile, menus et toaster chargés au premier usage. La
mesure est reproductible : `scripts` de mesure dans le rapport précédent, résultats ci-dessus.

## 7. Vérification globale

- Tests unitaires : 224 (`pnpm test`).
- Parcours Playwright (desktop Chromium + Pixel 7) : 244 exécutions dans la suite complète lancée
  sur le build des lots 1 à 5 : 230 réussies, 13 ignorées par conception (caméra réelle, contrôles
  desktop sur mobile, panneau des pages sur mobile) et 1 échec, un défaut d'accessibilité introduit
  par le lot 5 (champ de fichier « Insérer un PDF » sans libellé). Après correction, les suites
  concernées (`a11y`, `lot5`, `site`, `editor`, `offline`) ont été relancées : 54 réussies,
  10 ignorées, 0 échec. Les suites nouvelles sont `offline`, `conversion`, `home-drop`, `lot5`.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` passent.
- Non fait : Lighthouse (installation refusée dans l'environnement), appareils réels (voir
  `docs/VALIDATION_APPAREIL_REEL.md`), Safari et Firefox.

## 8. Reste à faire

1. **Création de champs de formulaire** dans le modificateur (cases, champs texte, listes) : non
   commencé ; demande un modèle d'objets AcroForm dans l'éditeur, l'export via pdf-lib et des tests
   de remplissage dans d'autres lecteurs.
2. **Version anglaise** : dictionnaire, pages et registre à traduire (structure prévue).
3. **PowerPoint → PDF et PDF/A** : non proposés faute de moteur fiable dans le navigateur (rendu de
   diapositives, validation PDF/A) ; à envisager seulement avec un moteur local sérieux.
4. **Fonctions d'IA** (résumé, chat avec le document) : volontairement absentes, incompatibles avec
   la promesse « rien ne quitte le navigateur » sans modèle local.
5. **Connexion Drive / Dropbox** : non faite ; elle impose des jetons tiers et contredit la
   promesse de confidentialité, sauf import strictement local via le sélecteur de fichiers du
   système (déjà possible).
6. **Mesures réelles** : Lighthouse, appareils physiques (iPhone pour HEIC, Safari pour le hors
   ligne), charge sur de très gros fichiers (100 Mo, 1 000 pages) sur mobile bas de gamme.
7. **Modificateur** : insertion de pages avec une couche OCR existante (fondue dans le document,
   plus modifiable passage par passage ensuite) ; comparaison visuelle sensible à l'anticrénelage ;
   filigrane image sur les photos.
8. **Mise en ligne** : variables légales, URL publique, test des cartes de partage, soumission du
   sitemap, choix d'un CDN qui ne met pas `sw.js` en cache.
