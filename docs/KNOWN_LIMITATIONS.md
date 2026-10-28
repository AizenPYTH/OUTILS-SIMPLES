# Limites connues et améliorations prévues

Chaque limite ci-dessous est aussi écrite sur la page de l'outil concerné (section « Limites »).

## PDF

- **Éditeur, texte existant** (`docs/EDITION_TEXTE.md`, `docs/RAPPORT_MODIFICATEUR_PDF.md`) : un
  passage = un opérateur de texte de la page ; remplacé en place avec la police d'origine quand elle
  contient les caractères, sinon police standard pour ce passage (signalé). Pas de reflux : le texte
  qui suit n'est pas décalé. Non modifiables : polices Type 3, écriture verticale, texte des XObjects
  de formulaire / annotations / champs. L'aperçu recharge le document à chaque validation (temps
  proportionnel à la taille du fichier).
- **Éditeur, scans et OCR intégré** : l'OCR (Tesseract, navigateur) écrit une couche invisible
  alignée sur l'image ; corriger un passage reconnu modifie cette couche, et l'option « réécrire
  visiblement » repeint la zone (couleur de fond échantillonnée, police standard) sans reproduire la
  police du scan. Qualité estimée affichée ; pas de reconstruction de mise en page. L'OCR repart
  toujours du document d'origine (relancer remplace la couche). Le diagnostic à l'import analyse
  toutes les pages jusqu'à 80, puis un échantillon.
- **Éditeur, zoom** : 100 % = taille réelle (96 dpi) ; paliers 25–400 % ; une page plus petite
  que la zone reste centrée, donc le zoom « autour du curseur » n'est exact que lorsque la page
  déborde ; en mode « ajuster », un panneau qui s'ouvre réajuste la page (en zoom manuel, rien ne
  bouge) ; au-delà de 16 Mpx de rendu, la densité de pixels est réduite (très fort zoom sur écran 3×).
- **Éditeur, formes et texte ajouté** : pas de rotation libre des objets (ils suivent la rotation
  de la page) ; pas de sélection multiple ; le redimensionnement d'un texte change sa taille de
  police (pas de reflux) ; l'italique n'existe pas pour DejaVu Sans ; les polices incorporées sont
  sous-ensemblisées à l'export (fichier léger) ; un caractère absent d'une police est remplacé par
  « ? » et signalé ; le masque visuel ne supprime pas les données (outil Caviarder pour cela).
- **Éditeur, recherche** : un mot coupé entre deux fragments de texte (ligatures, césure, deux
  opérateurs) n'est pas trouvé ; le remplacement ne concerne que les passages modifiables par
  « Modifier le texte » (pas de reflux, même police si possible).
- **Éditeur, pages** : réordonner, pivoter, dupliquer, supprimer sont appliqués à l'export (le
  document affiché reste l'original) ; pas de recadrage de page ni d'insertion de pages d'un autre
  fichier (outils dédiés).
- **Éditeur, protégés** : mot de passe d'ouverture demandé puis déverrouillage local (qpdf) ; le
  PDF exporté n'est plus chiffré ; les permissions propriétaire ne sont pas réappliquées.
- **Éditeur, ajouts** : superposés au contenu ; rendu à zoom × densité de pixels avec un plafond de
  16 Mpx par page (au-delà, la densité est réduite : très fort zoom un peu moins net sur écran 3×).
- **Polices** : 14 polices standard PDF (WinAnsi) pour tout texte dessiné (éditeur, numérotation,
  Markdown/texte → PDF, page de garde). Caractères non latins et emojis remplacés par « ? » avec
  avertissement. Intégration de polices Unicode (fontkit) prévue.
- **Annotations** : aplaties dans le contenu des pages, pas d'objets `/Annot` natifs.
- **Signature** : visuelle uniquement, pas de signature numérique (PKCS#7) ni qualifiée eIDAS.
- **Filigrane** : retrait fiable uniquement pour les filigranes AVEROPDF et les annotations `/Watermark`.
- **Compression** : seules les images JPEG et Flate RVB/gris 8 bits sans masque sont réencodées ; gain
  non garanti ; aucune page pixellisée.
- **Formulaires** : AcroForm uniquement ; XFA non pris en charge.
- **Fusion / division** : signets et liens internes non conservés.
- **Protection / déverrouillage** (qpdf WebAssembly) : le déverrouillage exige le mot de passe ; aucune
  attaque par force brute. Les permissions (impression, copie) sont indicatives : un lecteur peut les
  ignorer. AES-128 est produit avec `--use-aes=y` (qpdf ≥ 11 refuse RC4).
- **Vérifier / réparer** : la glue WebAssembly de qpdf n'expose pas sa sortie texte ; les messages sont
  capturés via la console du navigateur, et le chiffrement / la linéarisation sont aussi détectés par
  heuristiques sur les octets. Dans Node (tests), seuls les codes de sortie sont disponibles.
- **Extraction d'images** : CCITT fax et JBIG2 non décodés (renvoi vers « PDF vers images ») ; JPEG 2000
  fourni en .jp2 ; masque de transparence d'un JPEG non conservé.
- **Extraction de liens** : liens internes comptés mais non listés ; URL coupées sur deux lignes
  possiblement tronquées ; pas de détection sur les scans sans OCR.
- **Comparaison** : texte uniquement, page à page par numéro ; pas de comparaison d'images ni de mise
  en page.
- **Caviardage** : les pages marquées deviennent des images (150–300 dpi), donc plus de texte
  sélectionnable sur ces pages ; la recherche automatique ne couvre que le texte réel ; relecture humaine
  indispensable.
- **Rechercher / extraire le texte** : ordre de lecture suivant la position des éléments ; colonnes et
  tableaux parfois mélangés ; polices mal encodées illisibles (limite du fichier source).

## Numérisation et OCR

- Tesseract 5 LSTM en WebAssembly : 2 à 15 s par page **par passe** ; en mode automatique, une page
  dont une partie reste illisible déclenche une passe à 180° puis, si besoin, à 90° et 270° (jusqu'à
  quatre reconnaissances). Pas de détection d'orientation native (pas de modèle OSD) : les
  orientations sont trouvées par ces passes et par la ligne de base de chaque ligne.
- Qualité dépendante du document (texte imprimé net à 200–300 dpi recommandé) ; écriture manuscrite,
  polices fantaisie, photos floues et tableaux mal reconnus ; mots de confiance < 30 ignorés dans le
  PDF recherchable, < 60 signalés en rouge ; inclinaison corrigée jusqu'à ± 6° seulement ; 200 pages
  maximum. Détails : `docs/OCR_ORIENTATIONS.md`.
- Langues : français et anglais (modèles auto-hébergés, ≈ 6,3 Mo et 10,9 Mo compressés, téléchargés une
  fois par session ; pas encore de mise en cache persistante).
- Scanner : la photo d'origine est conservée et affichée sans filtre ; recadrage rectangulaire ou
  redressement par quatre coins (détection automatique supposant une feuille plus claire que le
  fond) ; résolution de sortie plafonnée (2400 px) ; capture caméra uniquement en HTTPS avec un
  navigateur récent ; aucune caméra physique ni téléphone réel n'a pu être testé ici (périphérique
  factice Chromium seulement, procédure manuelle dans `docs/AUDIT_QUALITE.md`).
- Perspective : détection des coins supposant une feuille plus claire que le fond ; documents pliés ou
  courbés non corrigés localement ; 3000 px maximum ; une page à la fois.

## Images

- Formats lus par le navigateur uniquement (JPG, PNG, WebP, GIF première image, BMP, AVIF, SVG) ; HEIC/HEIF
  (iPhone) et TIFF exclus.
- Les fichiers produits ne contiennent plus l'EXIF (orientation appliquée avant traitement).
- Filigrane : texte uniquement, pas de logo.
- EXIF : suppression sans perte pour JPEG et PNG seulement ; autres formats réencodés en PNG.
- Palette : couleurs moyennes sur une image réduite à 320 px ; une petite zone importante peut être
  absorbée.

## Documents et conversions

- Markdown → PDF : images ignorées (texte alternatif conservé), HTML brut ignoré, tableaux à colonnes
  égales, notes de bas de page non interprétées.
- Pas de conversion Office (DOCX, XLSX, PPTX) : impossible à faire fidèlement sans serveur.
- Calendriers : jours fériés légaux français (option Alsace-Moselle) ; pas de vacances scolaires.
- Feuilles : imprimer à 100 % pour des dimensions exactes.

## Codes, couleurs, calculatrices, développeur

- Lecteur de QR : QR uniquement (pas de codes-barres linéaires ni Data Matrix) ; photo analysée, pas de
  flux vidéo continu.
- Codes-barres : dessin conforme, mais les préfixes EAN/UPC doivent être attribués par GS1 ; Code 128
  limité à l'ASCII imprimable.
- CMYK : approximation sans profil ICC. Noms CSS limités aux plus courants.
- Jours ouvrés : lundi à vendredi ; fériés nationaux seulement ; pas de jours ouvrables (samedi inclus).
- TVA : taux français ; arrondi au centime par ligne.
- Hash : pas de MD5 (absent de Web Crypto) ; fichiers lus entièrement en mémoire.
- Regex : syntaxe JavaScript ; une expression pathologique peut figer l'onglet un instant.

## Limites techniques transversales

- pdf-lib, les filtres d'image et l'homographie s'exécutent sur le thread principal (rendez-vous
  `setTimeout` pour laisser peindre) ; déplacement vers un Web Worker prévu. Tesseract et pdf.js utilisent
  déjà leurs propres workers.
- CSP : `'unsafe-inline'` (hydratation statique Next.js) et `'wasm-unsafe-eval'` (Tesseract, qpdf,
  décodeurs pdf.js) dans `script-src` ; pas d'`'unsafe-eval'`.
- Les actifs lourds (pdf.js 5,2 Mo, Tesseract ≈ 3,9 Mo pour la variante téléchargée, modèles OCR 6,3 et
  10,9 Mo, qpdf 1,3 Mo) sont servis par le site lui-même et téléchargés uniquement sur la page qui les
  utilise, après action de l'utilisateur pour l'OCR et qpdf.
- La bannière de consentement interne n'est pas une CMP certifiée Google : obligatoire avant AdSense en EEE.
- Pas d'image Open Graph dédiée.

## Qualité / tests

- 197 tests Vitest ; 110 parcours Playwright exécutés sur desktop et mobile (Pixel 7), avec vérification des
  fichiers produits, de la confidentialité réseau, de l'accessibilité (axe-core), de la caméra (périphérique
  factice Chromium) et des gros fichiers (60 Mo traité, 101 Mo et 1 001 pages refusés). Non couverts
  automatiquement : glisser-déposer tactile de dnd-kit, pad de signature dessiné, caméra physique,
  Safari/Firefox, performances sur mobile bas de gamme. Voir `docs/AUDIT_QUALITE.md` (procédure manuelle).
