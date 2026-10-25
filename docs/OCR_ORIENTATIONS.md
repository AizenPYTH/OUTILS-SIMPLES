# OCR : orientations multiples, prétraitement et couche de texte

## 1. Reproduction et diagnostic

Aucune pièce jointe (étiquette Chronopost, capture d'écran) n'était présente dans la conversation ni
dans le dossier d'envois de l'environnement. Un cas de régression **synthétique et reproductible** a
donc été construit : `tests/fixtures/label-mixed-orientation.pdf`, une étiquette de colis avec
un en-tête et un bloc destinataire à l'endroit, un panneau latéral tourné à 90° (lu de bas en haut),
une consigne de retour à l'envers (180°), une bande de type code-barres et un numéro de colis.

Le document rendu à 200 dpi puis passé dans Tesseract.js 7 (modèle `fra`, `PSM.AUTO`) donne, dans
Node, **avant** toute modification :

| Région            | Résultat de Tesseract                                                          | Boîte renvoyée                                                                                   |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Texte à l'endroit | correct, confiance ≈ 95                                                        | boîtes horizontales                                                                              |
| Panneau à 90°     | **correct**, confiance ≈ 95 (Tesseract détecte lui-même les lignes verticales) | boîtes **hautes et étroites** (ex. 27 × 524 px), `baseline` verticale allant du bas vers le haut |
| Consigne à 180°   | charabia (`SIVTIF4 30 30N39V ‘1N3SAV IS YNOLIU`), confiance 37                 | boîte horizontale                                                                                |

Causes réelles des défauts visibles dans OUTILIA :

1. **Couche de texte du PDF recherchable** (`searchable-pdf.ts`) : chaque mot était dessiné
   horizontalement avec une taille de police tirée de la **hauteur** de sa boîte. Pour un mot du
   panneau vertical (boîte de 27 px de large et 300 px de haut), cela donnait un glyphe invisible de
   plusieurs centaines de points, étiré horizontalement, posé en travers de la page : à la sélection
   dans un lecteur, des rectangles immenses, dans la mauvaise orientation, qui se chevauchent. **Le
   rendu PDF.js, les matrices de pages et les coordonnées canvas/CSS n'étaient pas en cause** : le
   même défaut se reproduit en Node sans aucun rendu.
2. **Modèle de résultat** : `OcrLine`/`OcrWord` ne portaient aucune orientation ; la `baseline` que
   Tesseract fournit (direction réelle de lecture) était ignorée.
3. **Texte à l'envers** : une seule passe, pas de second essai ; le charabia à faible confiance était
   gardé dans le texte et dans la couche invisible.
4. **Colonnes** : deux colonnes partageant une ligne de base étaient fusionnées en une seule ligne.
5. **Prétraitement** : aucun ; pas de correction d'inclinaison.

## 2. Ce qui a été implémenté (`src/lib/ocr/`)

- `orientation.ts` (pur, testé en Node) : rotation d'image par quarts de tour, rotation fine
  bilinéaire pour le redressement, **estimation de l'inclinaison** (profil de projection, ± 6°),
  direction de ligne **à partir de la baseline** (0°, 90°, 180°, 270° + inclinaison résiduelle),
  **transformation inverse** des boîtes de la copie de travail (tournée, redressée) vers l'image
  d'origine, **fusion de passes** (la lecture la plus confiante d'une région gagne, les chevauchements
  des autres passes sont écartés), **découpe des lignes aux grands blancs** et **ordre par
  colonnes**, assemblage du texte (orientation dominante d'abord, puis sections titrées).
- `preprocess.ts` : niveaux de gris + étirement de contraste (2–98 %), filtre « document », noir et
  blanc (Otsu). Toujours sur une **copie de travail** ; l'image d'origine reste celle de l'aperçu et
  de la couche visible du PDF.
- `engine.ts` : modes d'orientation **Automatique** (passe 0°, puis 180° si une part du texte reste
  peu fiable, puis 90°/270°), **Mixte** (0° + 180°), **Toutes** (4 passes), ou fixe. Pour chaque passe :
  prétraitement → rotation → redressement → reconnaissance → boîtes ramenées dans l'image d'origine.
  Résultat enrichi : passes exécutées, orientation dominante, drapeau « orientations mixtes »,
  inclinaison corrigée.
- `searchable-pdf.ts` : chaque mot est écrit **dans la direction de sa ligne** (`rotate`), avec une
  taille tirée de l'épaisseur de la ligne (largeur pour un texte vertical), l'origine placée sur le
  bon côté de la boîte selon l'angle, et l'étirement horizontal ajusté à la longueur du mot.
- Interface (`ocr-tool.tsx`) : options avancées (orientation, prétraitement, redressement), aperçu
  avec **zones reconnues colorées par confiance** (rouge < 60 %), passes et orientation affichées,
  texte corrigible, export.

## 3. Ce que les moteurs permettent, et ce qui ne l'est pas

- Tesseract.js (LSTM, sans `osd.traineddata`) **n'offre pas de détection automatique d'orientation
  de page**. Elle est remplacée par la stratégie de passes : fiable sur du texte net, plus lente (2 à
  4 reconnaissances par page en mode automatique quand la page le demande).
- Les lignes verticales sont souvent lues directement par Tesseract ; les passes 90°/270° ne servent
  que lorsque ce n'est pas le cas (mots isolés, petites zones).
- Une inclinaison au-delà de ± 6° n'est pas corrigée : utiliser « Corriger un document photographié ».
- Les mots de confiance < 30 % ne sont pas écrits dans la couche invisible ; ceux < 60 % sont signalés
  en rouge dans l'aperçu.

## 4. Tests

`tests/unit/ocr-orientation.test.ts` (Tesseract réel dans Node, images synthétiques au canvas, texte
attendu connu, **taux d'erreur caractère mesuré**) : pages à 0°, 90°, 180°, 270° (mode explicite et
automatique, CER < 5 %), page à deux régions d'orientations différentes (chaque région lue dans sa
direction, CER < 6 % par région, aucun charabia conservé, boîtes à leur place), deux colonnes
(non entremêlées), petits caractères, page inclinée de 2,5° (inclinaison estimée et corrigée, boîtes
ramenées sur l'original), couleur, niveaux de gris, texte avec code-barres et QR code, puis PDF
recherchable relu avec pdf.js : chaque mot est à l'angle de sa ligne (0°, 90°, 180°), à sa position,
avec une taille plausible. `e2e/ocr.spec.ts` rejoue l'étiquette dans l'interface jusqu'au PDF exporté.

Ces images sont des rendus propres : les seuils ne disent rien d'une photo floue ou d'un manuscrit.
