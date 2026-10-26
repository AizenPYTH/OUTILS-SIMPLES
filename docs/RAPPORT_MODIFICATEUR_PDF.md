# OUTILIA — Rapport : le modificateur PDF (`/pdf/modifier/`)

Documents liés : `docs/EDITION_TEXTE.md` (édition du texte existant), `docs/OCR_ORIENTATIONS.md`
(moteur OCR), `docs/DESIGN_PRINCIPES.md` (identité v2), `docs/KNOWN_LIMITATIONS.md`,
`docs/VALIDATION_APPAREIL_REEL.md`, `docs/RAPPORT_MISSION.md` (mission précédente). Captures :
`docs/captures/modificateur/` (script `scripts/capture-editor-screenshots.mjs`).

## 1. Causes exactes des problèmes constatés

État de départ : branche `claude/festive-turing-f4fmzh`, commit `af5dd15` (169 tests Vitest,
185 parcours Playwright réussis + 9 ignorés, typecheck/lint/build verts, réexécutés avant toute
modification). Sites de référence (Smallpdf, iLovePDF, PDF24, Acrobat) toujours **inaccessibles**
depuis l'environnement (proxy) : aucune analyse de leurs interfaces n'a été faite ni inventée.

| Problème                                                        | Cause réelle                                                                                                                                                                                                                                                                           | Où                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| PDF protégé par mot de passe : « impossible à ouvrir »          | pdf.js levait `PasswordException` ; `toPdfError` la traduisait en erreur `ENCRYPTED` terminale (« déverrouillez-le avant de l'utiliser ici »). Aucune demande de mot de passe, alors que qpdf (déjà intégré pour l'outil Déverrouiller) sait déchiffrer localement.                    | `use-pdf-document.ts`, `pdfjs.ts`, `errors.ts`             |
| Scan « refusé » / rien à modifier                               | Le sélecteur de fichiers acceptait bien tout PDF (`application/pdf,.pdf`) ; la signature `%PDF` était vérifiée dans le premier Ko. Mais rien n'analysait le contenu à l'import : le scan n'était détecté que dans l'outil « Modifier le texte », avec un simple lien vers l'outil OCR. | `single-file-tool.tsx`, `text-edit-layer.tsx`              |
| Texte OCR existant non modifiable                               | Les opérateurs en mode de rendu 3/7 (couche invisible) étaient marqués « texte invisible : non modifiable ».                                                                                                                                                                           | `extract-runs.ts`                                          |
| Couche OCR sur un PDF existant impossible                       | `buildSearchablePdf` créait un document neuf à partir d'images ; aucune fonction n'ajoutait une couche à des pages existantes (pages pivotées comprises).                                                                                                                              | `searchable-pdf.ts`                                        |
| Annuler/Rétablir « malhonnêtes »                                | L'historique ne couvrait que les annotations ; les textes modifiés n'étaient réversibles que passage par passage, les pages pas du tout.                                                                                                                                               | `use-annotation-history.ts`                                |
| Pas d'organisation des pages dans l'éditeur                     | Fonction absente (outils séparés Organiser / Pivoter).                                                                                                                                                                                                                                 | —                                                          |
| Export non vérifié, intitulé générique                          | `applyTextEdits` puis `applyAnnotations`, sans réouverture ; dialogue « Télécharger le PDF ».                                                                                                                                                                                          | `annotation-workspace.tsx`                                 |
| Gros fichiers sans retour                                       | `openPdf` lisait toutes les tailles de page sans progression ; un seul état « Lecture du fichier… ».                                                                                                                                                                                   | `pdfjs.ts`, `single-file-tool.tsx`                         |
| Interface : rail trop haut, miniatures non repliables, contours | Rail de 12 outils de 56 px (débordait sous 900 px de haut), miniatures fixes à 150 px, zones de texte toujours contourées (page « quadrillée »), aucune aide ni panneau.                                                                                                               | `toolbar.tsx`, `thumbnail-rail.tsx`, `text-edit-layer.tsx` |

## 2. Fichiers modifiés ou créés, et pourquoi

Bibliothèque (sans réécriture du moteur ; corrections ciblées) :

- `src/lib/pdf/browser/diagnose.ts` (nouveau) : diagnostic par page (caractères réels via
  `getTextContent`, images via la liste d'opérateurs, couche invisible via les modes de rendu),
  verdict natif / mixte / scanné / vide, échantillonnage au-delà de 80 pages, progression.
- `src/lib/pdf/browser/pdfjs.ts` : `openPdf(bytes, { password, onProgress })`, `PdfPasswordError`
  (`required` / `incorrect`), `renderPageToRaster` (page → pixels pour l'OCR, canvas libéré).
- `src/lib/ocr/searchable-pdf.ts` : `addOcrLayer` (couche invisible ajoutée aux pages d'un PDF
  existant, `/Rotate` pris en compte par `rotateOcrResultIntoUserSpace`).
- `src/lib/pdf/operations/page-plan.ts` (nouveau) : plan de pages (ordre, rotation, duplication,
  suppression) appliqué à l'export avec pdf-lib ; plan identité = octets inchangés.
- `src/lib/pdf/text-edit/{types,extract-runs,apply}.ts` : passages `kind: "native" | "ocr"` ; les
  passages invisibles deviennent modifiables (correction de la couche) ; option `visual` (boîte
  repeinte avec la couleur de fond échantillonnée + texte visible `0 Tr` en police standard, puis
  retour `3 Tr`), avec suivi de la matrice de texte pour rouvrir l'objet texte au même endroit.
- `src/components/pdf/hooks/use-pdf-document.ts` : phases `reading / opening / unlocking /
analysing` avec progression, état `password` (vérification pdf.js puis déchiffrement qpdf
  local et réouverture des octets déchiffrés), diagnostic optionnel (`analyse`).

Interface :

- `src/components/pdf/shared/single-file-tool.tsx`, `password-panel.tsx` (nouveau),
  `processing-panel.tsx` : états d'import libellés, saisie du mot de passe (erreur « incorrect »,
  retour au choix du fichier). Tous les outils à fichier unique en bénéficient.
- `src/components/pdf/workspace/annotation-workspace.tsx` (réécrit) : quatre zones, document de
  base original ou + couche OCR, aperçu reconstruit à chaque changement d'édits (undo/redo inclus),
  plan de pages, export vérifié, raccourcis, zoom molette, confirmation de fermeture.
- `editor-header.tsx`, `toolbar.tsx` (groupes par intention + boutons de panneaux), `pages-panel.tsx`
  (dnd-kit, actions de page), `side-panel.tsx` (OCR, document, historique, raccourcis),
  `import-diagnosis.tsx`, `export-dialog.tsx`, `context-bar.tsx` (outil texte : « Zones de texte »,
  état de la page), `text-edit-layer.tsx` (contours discrets au survol ou à la demande, passages
  OCR, bouton « Lancer l'OCR »), `use-editor-history.ts` (annotations + textes + plan),
  `use-editor-ocr.ts` (moteur Tesseract page par page, annulation, qualité estimée), `types.ts`.
  Supprimés : `thumbnail-rail.tsx`, `use-annotation-history.ts`.
- `src/lib/tools/registry/pdf-core.ts` : étapes, limites et FAQ de l'outil mises à jour.
- Tests et fixtures : `tests/unit/editor-foundations.test.ts`, `e2e/editor.spec.ts`,
  `e2e/a11y.spec.ts`, `scripts/generate-editor-fixtures.mjs` (`mixed-text-scan.pdf`,
  `scan-text.pdf`, `protected-user.pdf` AES-256 « secret42 »), `scripts/capture-editor-screenshots.mjs`.
- Documentation : `docs/ARCHITECTURE.md`, `docs/KNOWN_LIMITATIONS.md`, ce rapport.

## 3. Améliorations d'interface et décisions UX

- **A. En-tête 48 px** : retour, nom du fichier + « modifié », puce d'état du document (« 3 pages ·
  texte natif », « 1 page · OCR 95 % », « 3 pages · 1 scannée »), résumé (« 2 éléments · 1 texte
  modifié · 4 pages (réorganisées) · déverrouillé »), Annuler / Rétablir avec le libellé de l'étape,
  bouton principal « Télécharger le PDF modifié », menu secondaire (panneaux, page entière, revenir
  au document d'origine, fermer).
- **B. Rail par intention** : Sélection · Texte (modifier, ajouter, commentaire) · Annoter · Insérer,
  puis « Document » (Pages, OCR, Infos, Aide) en grille compacte ; boutons de 46 px pour tenir en
  860 px de haut ; une ligne défilante sur mobile. Un raccourci par outil (V, E, T, N, P, H, U, R, O,
  A, I, S) affiché dans l'info-bulle.
- **C. Espace de travail** : ajustement à la largeur (plafonné à 1,3 × la hauteur) ou page entière,
  zoom par paliers 50–400 %, Ctrl + molette progressif, menu de zoom ; rendu net (densité d'écran,
  plafond 16 Mpx inchangé) ; Page suiv./préc. ; contours des passages **invisibles par défaut**,
  révélés au survol de la page ou par le bouton « Zones de texte » ; passages OCR en pointillés
  ambrés ; bandeau d'état traversable au clic (il ne bloque plus les zones sous lui, défaut vu sur
  mobile).
- **D. Panneau des pages** : repliable (ouvert par défaut ≥ 1024 px, superposé en dessous),
  miniatures 80 px avec rotation prévisualisée, numéro, point « modifiée », actions au survol ou au
  focus (pivoter ±90°, dupliquer, monter / descendre, supprimer — jamais la dernière page), glisser
  (pointeur, tactile, clavier).
- **Panneaux latéraux** (un seul à la fois, Échap ferme) : OCR (diagnostic, langue, pages à
  reconnaître, progression page par page avec interruption, bilan : pages, mots, langue, qualité
  estimée, « Revenir au document sans OCR »), Document (fichier, taille, contenu, protection, OCR,
  compteurs), Historique (liste des étapes), Raccourcis.
- **Import** : « Lecture du fichier… », « Ouverture du document… pages n / N », « Déverrouillage… »,
  « Analyse de votre document… page n / N », puis carte « PDF ouvert — N pages, dont k sans texte
  sélectionnable » / « Document scanné — … » avec **« Lancer l'OCR » / « Continuer sans OCR »**. Un
  document natif n'a pas de carte : la puce d'en-tête suffit.
- **Honnêteté** : aucun passage scanné n'est présenté comme modifiable avant l'OCR ; après l'OCR, le
  bandeau précise que l'on corrige une couche invisible et que « réécrire visiblement » change
  l'image avec une police standard ; l'export annonce l'aplatissement des ajouts et le résultat de
  la vérification ; fermer avec des modifications demande confirmation ; le fichier d'origine n'est
  jamais touché (copie locale, OCR retirable, « Revenir au document d'origine »).

## 4. Import : avant / après

| Cas                               | Avant                                                   | Après                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PDF natif                         | Éditeur                                                 | Puce « N pages · texte natif », éditeur                                                                                               |
| PDF entièrement scanné            | Éditeur ; outil texte : message + lien vers l'outil OCR | Carte « Document scanné — N pages sans texte sélectionnable », Lancer l'OCR / Continuer ; OCR intégré, passages reconnus corrigeables |
| Mixte (texte + pages images)      | Non distingué                                           | Carte « dont k sans texte », diagnostic page par page, OCR limité aux pages sans texte (ou toutes)                                    |
| Déjà OCRisé (couche invisible)    | « Texte invisible : non modifiable »                    | Détecté (« texte reconnu (OCR) »), passages corrigeables                                                                              |
| Pages pivotées / tailles mêlées   | OK                                                      | OK (diagnostic insensible, couche OCR replacée dans l'espace utilisateur de la page pivotée, test unitaire)                           |
| Protégé par mot de passe          | Erreur terminale                                        | Demande du mot de passe, « incorrect » signalé, déverrouillage local, export non chiffré, puce « déverrouillé »                       |
| Endommagé                         | Erreur « endommagé ou structure non prise en charge »   | Inchangé (distinct du cas protégé : testé)                                                                                            |
| Fausse extension `.pdf`           | « n'est pas un PDF valide »                             | Inchangé (signature vérifiée)                                                                                                         |
| Gros fichier                      | « Lecture du fichier… » sans progression                | Progression d'ouverture (tous les 25 pages) et d'analyse ; analyse échantillonnée au-delà de 80 pages                                 |
| Annulation du sélecteur, réimport | OK                                                      | OK (testé : fermeture puis nouvel import)                                                                                             |

## 5. OCR : détection et limites

- Détection : une page est « texte » dès 12 caractères non blancs extraits par pdf.js ; sinon
  « scannée » si elle dessine une image, « vide » autrement. Une page dont tout le texte est en mode
  de rendu 3/7 est comptée « couche OCR ». Au-delà de 80 pages : les 40 premières, une sur dix, la
  dernière (`sampled: true`, dit à l'écran).
- OCR intégré : rendu de chaque page à 2 600 px de côté maximum (≈ 220 dpi A4), moteur Tesseract
  (`fra`, `eng`, `fra+eng`), orientation automatique et redressement du moteur existant, une page en
  mémoire à la fois, interruption possible, couche écrite dans une copie du document d'origine
  (relancer remplace la couche ; retirer rend l'original). Qualité estimée = confiance pondérée par
  les caractères ; < 80 % invite à vérifier.
- Limites : pas de reproduction de la police du scan (réécriture visible en police standard sur un
  fond uni échantillonné : lisible, pas identique) ; pas de reconstruction de mise en page ; qualité
  dépendante du scan (manuscrit, photos floues, tableaux) ; temps de quelques secondes par page et
  ≈ 15 Mo de moteur / modèle chargés une fois ; les textes modifiés avant un nouvel OCR sur les mêmes
  pages sont retirés (les opérateurs changent) ; les passages OCR sont des mots (un opérateur par
  mot), donc on corrige mot par mot.

## 6. Tests exécutés et résultats

- `pnpm typecheck`, `pnpm lint`, `pnpm build` : OK.
- `pnpm test` (Vitest, Node) : **186 tests, 19 fichiers, 0 échec**. Nouveaux (`editor-foundations.test.ts`, 17 tests) :
  diagnostic natif / scanné / mixte / pivoté / tailles mêlées / couche OCR / échantillonnage ;
  mot de passe (requis, incorrect, correct ; déchiffrement qpdf puis pdf-lib ; endommagé et faux PDF
  distingués) ; couche OCR sur page droite (position du mot relue) et sur page `/Rotate 90`
  (origine et sens de lecture relus via la matrice du viewport) ; rotations 90/180/270 ; plan de
  pages (ordre, rotation cumulée, duplication, suppression, refus de vider) ; passage OCR corrigé
  (ancien texte absent, couche toujours invisible) ; réécriture visible (boîte peinte, `0 Tr … 3 Tr`,
  position conservée, voisins intacts) ; document de 120 pages (progression, échantillonnage).
- Playwright (Chromium desktop + Pixel 7 émulé, compilation finale) : **102 parcours × 2 projets = 194 réussis, 10 ignorés volontairement (clavier ou desktop seulement), 0 échec, 4,0 min**. Nouveaux
  parcours de l'éditeur : scan → carte de diagnostic → outil texte honnête → « Lancer l'OCR » →
  progression → couche résumée → passages OCR → correction → export relu (texte corrigé présent,
  image conservée) ; mixte page par page ; mot de passe (refusé puis accepté, export déverrouillé
  relu) ; panneau des pages (pivoter, dupliquer, supprimer, monter, undo/redo, export relu : ordre
  des pages et rotation) ; undo/redo d'un texte modifié, confirmation de fermeture, réimport ;
  accessibilité axe de l'éditeur (carte, rail, panneaux) + Échap / « ? ».
- Les parcours existants (ajout de texte, dessin, undo/redo, zoom, édition native, passage à 90°,
  signature, suppression clavier, fermeture) passent sans modification de leurs assertions.

## 7. Vérifications visuelles

Captures Chromium (1366 × 860 et Pixel 7) dans `docs/captures/modificateur/` : mot de passe (01),
zones de texte natif (02), texte modifié + actions de page (03), pages réorganisées + panneau Document
(04), export vérifié (05), confirmation de fermeture (06), diagnostic scan (07), OCR en cours (08),
OCR terminé avec zones reconnues (09), correction d'un passage OCR (10), raccourcis (11), mobile :
diagnostic mixte (12), éditeur (13), panneau des pages (14), panneau OCR (15). Corrigé après
relecture des captures : rail trop haut à 860 px (groupe Document hors écran) → boutons compacts et
grille ; bandeau d'état masquant les premières zones sur mobile → traversable au clic.

## 8. Fonctionnalités non terminées et limites

- Pas de reflux du texte (inchangé) ; pas de recadrage de page, d'insertion de pages d'un autre
  fichier, de numérotation / filigrane dans l'éditeur (outils dédiés existants) ; pas de recherche
  dans le document, de comparaison avant/après ni de mode plein écran dédié ; pas de détection de
  champs de formulaire (outil Remplir un formulaire).
- Réécriture visible d'un passage OCR : fond uni (couleur médiane autour de la boîte) ; sur un fond
  texturé ou dégradé, la retouche se voit.
- Panneau des pages : miniature de la rotation calculée par pdf.js (vraie), mais l'aperçu principal
  d'une page supprimée reste accessible tant qu'elle est dans le plan ; les annotations d'une page
  supprimée ne sont pas exportées (annoncé par le compteur, pas par une alerte).
- Déverrouillage : les permissions propriétaire ne sont pas réappliquées à l'export (document non
  chiffré).
- Mémoire : aperçu reconstruit à chaque modification de texte (document rechargé), OCR une page à la
  fois ; pas de test sur mobile d'entrée de gamme.

## 9. Points à valider sur appareil réel ou par une personne

- Safari / Firefox (non installables ici) : rail et panneaux, `Ctrl + molette`, dnd-kit tactile,
  champ de mot de passe, Tesseract (variante sans SIMD).
- Téléphone réel : glisser des pages au doigt (délai 200 ms), panneaux superposés, OCR d'un vrai
  scan (temps, mémoire), lisibilité des puces d'état tronquées.
- Documents de production variés : PDF protégés AES-128 / RC4 et mot de passe propriétaire seul,
  scans à 300 dpi réels, PDF mixtes de scanners professionnels (couche OCR existante), polices
  composites non Identity (édition native). Procédure : `docs/VALIDATION_APPAREIL_REEL.md` § 4.

## 10. Commit final et état du dépôt

Commit `af3aab6` sur `claude/festive-turing-f4fmzh` (après `af5dd15`), poussé : fondations (diagnostic, mot
de passe, couche OCR, plan de pages, passages OCR), interface en quatre zones, tests, fixtures,
captures, documentation. Arbre propre après commit ; aucun déploiement, aucune configuration
sensible touchée, aucune dépendance ajoutée. `pnpm typecheck`, `pnpm lint`, `pnpm build`,
`pnpm test` et la suite Playwright complète ont été exécutés sur cet état final.
