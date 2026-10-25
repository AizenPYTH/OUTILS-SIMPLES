# OUTILIA — Rapport de mission : qualité produit, OCR avancé, édition PDF, refonte design

Documents liés : `docs/DESIGN_PRINCIPES.md` (identité v2), `docs/OCR_ORIENTATIONS.md`,
`docs/EDITION_TEXTE.md`, `docs/MATRICE_OUTILS.md`, `docs/VALIDATION_APPAREIL_REEL.md`,
`docs/KNOWN_LIMITATIONS.md`.

## 0. État des lieux (phase 1)

- Branche `claude/festive-turing-f4fmzh`, lue au commit `2912f7a` ; code, registre (66 outils
  publiés), tests et rapports précédents examinés. Les anciens rapports n'ont pas été pris comme
  preuve : toutes les suites ont été réexécutées sur la compilation finale (§ 5).
- **Aucune pièce jointe** (étiquette Chronopost, capture) n'était présente dans la conversation ni dans
  le dossier d'envois de l'environnement : le cas de régression est une étiquette **synthétique**
  reproductible (`tests/fixtures/label-mixed-orientation.pdf`, zones à 0°, 90°, 180°, code-barres).
- Les quatre sites de référence restent **inaccessibles** depuis l'environnement (proxy réseau) ;
  aucune analyse de leurs interfaces n'a été inventée.

## 1. Changements de design

Identité v2 définie avant application (palette indigo + vert de confiance + teintes par famille,
Bricolage Grotesque / Instrument Sans, échelle, espacements, rayons, ombres, mouvement) puis
appliquée : accueil en dix sections (héros + recherche, 8 outils populaires, 8 familles, 4 parcours,
engagements, guides, FAQ, pied de page), catalogue `/outils/` (recherche, colonne des familles,
populaires, sous-groupes PDF / images / développeur, état vide avec suggestions), en-tête court avec
bouton catalogue, pied de page en quatre colonnes, carte d'outil unique teintée par famille, zones
d'import affinées, rail de l'éditeur groupé par tâche, caméra plein écran sur mobile avec
déclencheur de 72 px, interface OCR avec zones de confiance et options avancées repliées. Routes,
textes SEO, FAQ, JSON-LD et sitemap conservés (tests `site`, `a11y` verts).

## 2. Causes exactes des problèmes détectés

| Problème                                                                               | Cause réelle                                                                                                                                                                                                                                                                                                                                  | Où                                       |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| OCR : texte tourné restitué de travers, rectangles énormes qui se chevauchent          | La couche invisible écrivait chaque mot **horizontalement** avec une taille tirée de la **hauteur** de sa boîte ; pour une ligne verticale (boîte 27 × 524 px) cela donnait un glyphe de plusieurs centaines de points en travers. Ni pdf.js, ni les matrices de pages, ni le canvas n'étaient en cause (défaut reproduit en Node sans rendu) | `searchable-pdf.ts`                      |
| OCR : texte à l'envers en charabia                                                     | Une seule passe, charabia à 37 % de confiance conservé                                                                                                                                                                                                                                                                                        | `engine.ts`                              |
| OCR : deux colonnes fusionnées en une ligne                                            | Tesseract joint les lignes partageant une ligne de base ; aucun découpage                                                                                                                                                                                                                                                                     | `engine.ts`                              |
| OCR : pas de correction d'inclinaison, aucun prétraitement                             | Absents                                                                                                                                                                                                                                                                                                                                       | `preprocess.ts`, `orientation.ts`        |
| Éditeur : passages tournés non éditables, lignes découpées en fragments (PDF Chromium) | Boîtes et champ supposés horizontaux ; un opérateur = un passage sans fusion                                                                                                                                                                                                                                                                  | `text-edit-layer.tsx`, `extract-runs.ts` |
| Caméra : compteur de pages doublé                                                      | Pages déjà ajoutées comptées deux fois                                                                                                                                                                                                                                                                                                        | `camera-capture.tsx`                     |
| Scanner : bouton « Appliquer » du redressement inaccessible (desktop, photo paysage)   | Boîte de dialogue plus haute que l'écran                                                                                                                                                                                                                                                                                                      | `scanner-tool.tsx`                       |
| Pied de page : contraste insuffisant des compteurs                                     | Opacité 70 %                                                                                                                                                                                                                                                                                                                                  | `site-footer.tsx`                        |

## 3. Corrections fonctionnelles

- **OCR** : passes par orientation (automatique : 0° puis 180° puis 90°/270° si une part reste peu
  fiable ; modes mixte, toutes, fixe), direction de chaque ligne lue sur sa **baseline**, boîtes
  ramenées dans l'image d'origine après rotation et redressement, fusion des passes (lecture la plus
  confiante), découpe des grands blancs et ordre par colonnes, prétraitement sur copie de travail
  (contraste étiré, document, noir et blanc ; original conservé), inclinaison estimée et corrigée
  (± 6°), couche de texte écrite dans le sens de chaque ligne avec une taille plausible, texte
  restitué par orientation avec sections titrées, zones de confiance dans l'aperçu.
- **Éditeur** : champ en place qui suit la direction du passage (90°, 180°, pages `/Rotate`) ;
  fusion des fragments d'une même ligne (police, taille, baseline, sans repositionnement) avec
  suppression des opérateurs fusionnés ; ligatures affichées en lettres et réencodées ; table de
  codes complétée par l'`/Encoding` des polices non sous-ensemble.
- **Scanner** : orientation EXIF explicite à l'import, dialogue plein écran mobile, boîte de
  redressement bornée, compteur corrigé.
- **Tests adaptés** et nouveaux (voir § 5), fixtures : étiquette synthétique, PDF Chromium
  (polices sous-ensemble Identity-H), page image seule.

## 4. Matrice des 66 outils

`docs/MATRICE_OUTILS.md` : 22 « fonctionnel et vérifié », 41 « fonctionnel avec limites
documentées », 2 « fonctionnel, caméra réelle impossible à vérifier ici » (scanner, lecteur QR),
1 « partiellement vérifié » (codes-barres : douchette matérielle), 0 bug confirmé non corrigé,
0 non fonctionnel. Chaque ligne cite ses preuves (tests unitaires, parcours Playwright relisant le
fichier produit).

## 5. Tests réellement exécutés (compilation finale)

- `pnpm typecheck`, `pnpm lint`, `pnpm build` : OK.
- `pnpm test` (Vitest, Node) : **169 tests, 18 fichiers, 0 échec**. Nouveaux : 16 tests OCR avec
  Tesseract réel sur images synthétiques (CER mesuré : pages 0/90/180/270 < 5 %, régions mixtes < 6 %
  par région, colonnes, petits caractères, inclinaison 2,5°, couleur, gris, code-barres + QR, PDF
  recherchable relu : angle 0/90/180 et position de chaque mot), 6 tests de fidélité d'édition sur
  7 PDF, 1 test des sous-groupes du catalogue.
- Playwright (Chromium desktop + Pixel 7 émulé) : **97 parcours × 2 projets = 185 réussis, 9 ignorés
  volontairement (clavier ou desktop seulement), 0 échec, 4,2 min**. Nouveaux :
  étiquette OCR dans l'interface jusqu'au PDF relu ; passage à 90° modifié dans l'éditeur ;
  accueil, catalogue, filtres, a11y adaptés.
- Mesures : OCR étiquette 1 167 × 1 653 px, ≈ 0,9 s par passe en Node.

## 6. Limites de l'OCR et de l'édition du texte

- OCR : pas de détection d'orientation native (passes, donc jusqu'à 4× le temps) ; inclinaison > 6°
  non corrigée ; photos floues, manuscrit, tableaux : à vérifier (zones rouges) ; les seuils mesurés
  valent pour des rendus propres, pas pour des photos réelles.
- Édition : pas de reflux ; police standard pour un glyphe absent d'une police sous-ensemble (signalé) ;
  texte des XObjects de formulaire, annotations, champs, Type 3, vertical et scans non modifiable
  (OCR proposé pour les scans) ; crénage `TJ` remplacé par un `Tj` ; Annuler/Rétablir ne couvrent
  pas ces modifications (retour passage par passage).

## 7. Navigateurs et appareils effectivement testés

Chromium (Playwright) en desktop 1 280 × 720 / 1 366 × 860 et en émulation Pixel 7 (tactile,
DPR 2,625) ; caméra = périphérique factice Chromium. **Non testés** : Safari, Firefox, iPhone,
Android réel, caméra physique, douchette. Procédure : `docs/VALIDATION_APPAREIL_REEL.md`.

## 8. Risques encore ouverts

Comportement de `getUserMedia` et de l'orientation vidéo sur appareils réels ; mémoire sur mobiles
d'entrée de gamme (OCR multi-passes, PDF > 50 Mo) ; précision OCR sur photos ; polices composites non
Identity pour l'édition ; `createImageBitmap` avec `imageOrientation` sur navigateurs anciens ;
identité légale et CMP avant publication (inchangé).

## 9. Bibliothèques ajoutées et licences

- `@napi-rs/canvas` 1.0.13 (MIT), **dépendance de développement uniquement** : rendu d'images
  synthétiques et de PDF dans les tests Node. Rien de nouveau n'est livré au navigateur.

## 10. Coûts externes

Aucun : pas d'API, pas de téléversement, moteurs et modèles auto-hébergés.

## 11. Commits

`bfe042a` OCR orientations ; `e8e71b4` éditeur passages tournés et fidélité ; `7f6adf3` refonte
design v2 ; `0618136` interfaces de travail ; puis le commit de ce rapport (matrice, procédure,
documentation, résultats des suites).
