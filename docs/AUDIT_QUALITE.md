# Audit de qualité des 66 outils OUTILIA

Branche `claude/festive-turing-f4fmzh`, état audité : commit `95d941d` (fin de l'extension) ; corrections et tests
de l'audit : commits `481df21`, `596968b`, puis la phase de clôture des risques (section 8). Aucun outil ni aucune
catégorie ajoutés ; aucune préparation de déploiement.

## 1. Résumé

- **66 outils publiés, 66 routes**, chacun avec un composant chargé dynamiquement (vérifié par un test statique
  du renderer) et désormais **au moins un parcours Playwright** (avant l'audit : 5 outils sans parcours,
  7 outils testés sur l'interface seulement).
- **Vérifiés sur le résultat produit** (fichier téléchargé relu ou valeur calculée exacte) : **66 outils** après
  la phase de clôture (section 8) ; à la fin de l'audit initial, 6 ne l'étaient que partiellement (annoter,
  ajouter du texte, redimensionner, recadrer une image, palette, feuilles à imprimer).
- **Bugs confirmés et corrigés** (priorité haute, fausse promesse ou résultat incorrect) :
  1. *Protéger par mot de passe* en **AES-128 échouait toujours** (« Le traitement a échoué ») : qpdf ≥ 11
     refuse RC4 sans option explicite ; `--use-aes=y` est maintenant passé. Les permissions écrites sont
     relues par pdf.js dans les tests.
  2. *Vérifier / réparer* présentait **un PDF chiffré comme « structure endommagée »** avec « Chiffrement :
     Non » : la glue WebAssembly de qpdf n'expose pas sa sortie texte. Détection par heuristiques sur les
     octets, et capture de la console pendant l'exécution dans le navigateur (messages désormais affichés).
  3. *Comparer deux PDF* n'appliquait pas la limite de 500 pages annoncée.
- **Accessibilité** (sérieux selon axe-core, corrigés) : nom accessible du bouton de recherche de l'en-tête
  (présent sur toutes les pages), contraste 4,35:1 des descriptions d'options actives, curseurs Radix sans
  libellé (`role=slider` sur le pouce), focus non restitué à la fermeture du menu mobile. Après correction :
  **0 violation sérieuse ou critique** sur 13 pages représentatives et deux états « fichier chargé ».
- **Confidentialité** : pendant fusion, compression, QR, OCR et protection, **toutes les requêtes sont
  same-origin, en GET, sans corps** ; aucun cookie, aucun IndexedDB, seul le choix de consentement et le thème
  en localStorage. Le moteur et le modèle OCR sont bien servis par le site (`/ocr/…`), pas par un CDN.
- **Allègement** : les fichiers `.js`/`.wasm` du moteur Tesseract (≈ 9 Mo) copiés dans `public/` n'étaient
  jamais demandés par le worker (il charge les `.wasm.js` autonomes) ; ils ne sont plus copiés. Les tailles de
  téléchargement annoncées à l'utilisateur ont été corrigées (moteur ≈ 4 Mo, anglais ≈ 11 Mo).
- **Clôture (section 8)** : un troisième bug bloquant a été trouvé par le scénario caméra à périphérique
  factice : l'en-tête `Permissions-Policy` interdisait la caméra (`camera=()`) sur tout le site, donc la prise
  de vue du scanner et du lecteur de QR échouait toujours en production. Corrigé (`camera=(self)`), test de
  régression ajouté. Les six outils partiels sont désormais vérifiés sur le fichier produit ; les gros fichiers
  (101 Mo refusé, 60 Mo traité, 1 001 pages refusées, 51 images, 20 Mpx) sont couverts par des scénarios
  reproductibles ; Safari et Firefox restent **non testés** (téléchargement des navigateurs refusé par le
  proxy de cet environnement) et font l'objet d'une procédure manuelle.

## 2. Méthode

- **Inventaire** : registre (`src/lib/tools/registry/*`) croisé avec le renderer et les fichiers de tests
  (script de couverture), pour chaque outil : route, composant, implémentation partagée, tests existants.
- **Tests d'interface (I)** : le parcours vérifie des éléments affichés (états, messages, compteurs).
- **Tests du résultat (R)** : le fichier téléchargé est relu (pdf-lib, pdf.js, en-têtes PNG/JPEG/WebP,
  fflate pour les ZIP, exifr pour l'EXIF) ou la valeur produite est comparée à une valeur exacte attendue.
- **Tests unitaires (U)** : bibliothèques pures exécutées en Node sur des fixtures réelles.
- Environnements exécutés : Chromium desktop 1280×720 et émulation Pixel 7 (tactile, 412 px) ; Node 22 pour
  les tests unitaires. **Non exécutés** : Safari, Firefox, appareil mobile réel, caméra réelle.
- Chiffres finaux : `pnpm typecheck` 0 erreur · `pnpm lint` 0 problème · `pnpm test` 133 tests (14 fichiers) ·
  `pnpm build` 96 pages · `pnpm test:e2e` 77 parcours × 2 projets = 145 exécutions vertes, 9 ignorées
  volontairement (raccourcis clavier et axe sur mobile, menu mobile sur desktop).

## 3. Implémentations partagées et modes restreints

| Fichier partagé | Outils | Vérification |
| --- | --- | --- |
| `annotation-tool.tsx` → `AnnotationWorkspace` | Modifier, Annoter, Ajouter du texte, Signer | e2e : la barre d'outils n'expose que les outils du mode (texte : sélection + texte ; signer : signature + texte ; annoter : surligner, souligner, stylo, commentaire, formes, sans signature ni image ; éditeur : tout). Export testé via l'éditeur et la signature. |
| `extract-text-tool.tsx` | Extraire le texte, Rechercher | e2e : le mode recherche compte les occurrences et les pages ; l'extraction produit le texte attendu. |
| `protect-tool.tsx` | Protéger, Déverrouiller, Vérifier | U + e2e : permissions relues par pdf.js, mot de passe unique / propriétaire seul, mauvais mot de passe, AES-128 et 256, fichier déjà chiffré refusé ; vérification sur fichier sain, endommagé et chiffré. |
| `json-tool.tsx` | JSON, CSV → JSON | e2e sur les deux routes. |
| `encoder-tool.tsx` | Base64, URL, entités HTML | e2e sur les trois routes (encodage et décodage). |
| `percent-tool.tsx` | Pourcentage, TVA | e2e sur les deux routes. |
| `color-tool.tsx` | Couleurs, Palette d'image | e2e sur les deux routes. |
| `markdown-pdf-tool.tsx` | Markdown → PDF, Texte → PDF | e2e sur les deux routes, PDF relu. |
| `printables-tool.tsx` | Feuilles, Calendrier, Page de garde | e2e sur les trois routes, PDF relu (calendrier et page de garde : texte attendu). |

## 4. Matrice d'audit

Légende : **U** test unitaire de la bibliothèque · **I** parcours Playwright vérifiant l'interface · **R** parcours
Playwright vérifiant le fichier ou la valeur produite · « (audit) » = ajouté pendant l'audit.

| Outil | Route | Impl. partagée | Tests | Statut | Limites principales | Risques | Correctif audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Modifier un PDF | `/pdf/modifier/` | annotation-tool (mode editor) · workspace commun | U applyAnnotations · R e2e export texte/dessin/undo | **Vérifié** | Superposition, polices standard | Thread principal sur gros documents | — |
| Fusionner des PDF | `/pdf/fusionner/` | — | U merge · R e2e 8 pages, ordre, taille | **Vérifié** | Signets non conservés | — | — |
| Diviser un PDF | `/pdf/diviser/` | — | U split/ranges · R e2e ZIP et pages | **Vérifié** | — | — | — |
| Compresser un PDF | `/pdf/compresser/` | — | U compress (images, structure) · R e2e avant/après | **Vérifié** | Gain non garanti | — | — |
| Organiser les pages d'un PDF | `/pdf/organiser/` | — | U organize · R e2e ordre exporté | **Vérifié** | — | — | — |
| Pivoter un PDF | `/pdf/rotation/` | — | U rotatePages · R e2e | **Vérifié** | — | — | — |
| Extraire des pages d'un PDF | `/pdf/extraire-pages/` | — | U extractPages · R e2e sélection | **Vérifié** | — | — | — |
| Ajouter du texte à un PDF | `/pdf/ajouter-texte/` | annotation-tool (mode text) | U drawText rotated · I barre restreinte · R e2e texte présent sur la page 2 seulement (clôture) | **Vérifié** | Polices standard | — | — |
| Annoter un PDF | `/pdf/annoter/` | annotation-tool (mode annotate) | U applyAnnotations · I barre restreinte · R e2e export relu : surlignage (ExtGState), rectangle, commentaire dans le texte, autres pages intactes (clôture) | **Vérifié** | Annotations aplaties | — | — |
| Signer un PDF | `/pdf/signer/` | annotation-tool (mode sign) | R e2e signature tapée exportée · I barre restreinte | **Vérifié** | Pas de signature qualifiée | Pad dessiné non testé e2e | — |
| Ajouter un filigrane à un PDF | `/pdf/ajouter-filigrane/` | — | U addWatermark · R e2e + retrait | **Vérifié** | — | — | — |
| Gérer un filigrane PDF | `/pdf/gerer-filigrane/` | — | U analyze/remove · R e2e cas « rien à retirer » | **Vérifié** | Filigranes fondus non traités | — | — |
| Remplir un formulaire PDF | `/pdf/remplir-formulaire/` | — | U inspect/fill/flatten · R e2e aplati | **Vérifié** | XFA non pris en charge | — | — |
| Extraire le texte d'un PDF | `/pdf/extraire-le-texte/` | extract-text-tool (mode extract) | U assembleTextItems · R e2e texte attendu | **Vérifié** | Ordre colonnes | — | — |
| Rechercher dans un PDF | `/pdf/rechercher-dans-un-pdf/` | extract-text-tool (mode search) | U searchPages · R e2e occurrences/pages (audit) | **Vérifié** | Scans sans OCR | — | — |
| Convertir un PDF en images | `/pdf/convertir-en-images/` | — | R e2e ZIP PNG 2480×3508 à 300 dpi (audit) | **Vérifié** | Plafond 25 Mpx | — | — |
| Convertir des images en PDF | `/pdf/images-en-pdf/` | — | U tailles/dpi (audit) · R e2e multipage | **Vérifié** | — | — | — |
| Recadrer un PDF | `/pdf/recadrer/` | — | U pages sélectionnées (audit) · R e2e CropBox | **Vérifié** | Recadrage non destructif (CropBox) | — | — |
| Numéroter les pages d'un PDF | `/pdf/numeroter-les-pages/` | — | U début/numéro/page pivotée (audit) · R e2e pied de page | **Vérifié** | Polices standard | — | — |
| Protéger un PDF par mot de passe | `/pdf/proteger-par-mot-de-passe/` | protect-tool | U permissions lues par pdf.js, AES-128/256, propriétaire seul (audit) · R e2e AES-256 et AES-128 | **Vérifié** | Restrictions indicatives | — | AES-128 inopérant → corrigé (--use-aes=y) |
| Déverrouiller un PDF | `/pdf/deverrouiller/` | protect-tool | U mauvais mot de passe, propriétaire (audit) · R e2e erreur puis déverrouillage | **Vérifié** | Case « autorisé » déclarative | Aucun contrôle réel de l'autorisation (par conception) | — |
| Vérifier et réparer un PDF | `/pdf/verifier-reparer/` | protect-tool | U rapport (audit) · R e2e sain / endommagé / chiffré (audit) | **Vérifié** | Détail des messages qpdf uniquement en navigateur | — | PDF chiffré présenté comme endommagé → corrigé (heuristiques) |
| Métadonnées d'un PDF | `/pdf/metadonnees/` | — | U read/update/strip · R e2e titre supprimé | **Vérifié** | XMP d'images non traité | — | — |
| Extraire les liens d'un PDF | `/pdf/extraire-les-liens/` | — | U annotations + texte · R e2e 4 liens listés, interne compté | **Vérifié** | URL coupées | — | — |
| Extraire les images d'un PDF | `/pdf/extraire-les-images/` | — | U JPEG verbatim, PNG+alpha, RGB brut · R e2e 2 images, dims | **Vérifié** | CCITT/JBIG2 ignorés | — | — |
| Comparer deux PDF | `/pdf/comparer-deux-pdf/` | — | U comparePageTexts · R e2e 5 pages, statut « ajoutée » | **Vérifié** | Texte seulement | Limite de pages non appliquée → corrigée | — |
| Caviarder un PDF (supprimer des informations) | `/pdf/caviarder/` | — | U page pivotée, métadonnées (audit) · R e2e texte disparu, page pivotée (audit) | **Vérifié** | Pages rastérisées | Relecture humaine indispensable | — |
| Scanner un document | `/numerisation/scanner-un-document/` | — | U pipeline (filtres, Otsu) · R e2e PDF 2 pages, sortie N&B à deux tons · caméra factice Chromium : 2 prises → PDF, flux arrêté, refus géré (clôture) | **Vérifié** | Caméra réelle non testable en CI | Appareil réel non testé | Permissions-Policy bloquait la caméra → corrigé |
| Corriger un document photographié | `/numerisation/corriger-un-document-photographie/` | — | U homographie, détection · R e2e JPG redressé plus petit que la photo (audit) | **Vérifié** | Détection sur fond contrasté | Précision géométrique non mesurée au pixel | — |
| OCR : reconnaître le texte d'un PDF ou d'une image | `/numerisation/ocr/` | — | U PDF recherchable · R e2e image et PDF scanné : « Facture », « 2026 », export recherchable (audit) | **Vérifié** | Une fixture imprimée nette | Qualité sur scans réels variés non mesurée | — |
| Compresser une image | `/images/compresser/` | image-batch-tool | R e2e WebP valide et plus léger (audit) | **Vérifié** | — | — | — |
| Redimensionner une image | `/images/redimensionner/` | image-batch-tool | U fitDimensions · R e2e dimensions lues dans le JPEG pour les méthodes largeur, pourcentage, exact, tenir dans (clôture) | **Vérifié** | Agrandissement désactivé par défaut | — | — |
| Recadrer une image | `/images/recadrer/` | crop-box | U clampCrop · R e2e PNG 200×100 relu, pixels de la zone exacts (rouge / bleu) (clôture) | **Vérifié** | Champs clampés à la saisie | — | — |
| Convertir une image (JPG, PNG, WebP) | `/images/convertir/` | image-batch-tool | R e2e magic bytes JPEG (audit), transparence aplatie | **Vérifié** | GIF première image | — | — |
| Pivoter ou retourner une image | `/images/pivoter-retourner/` | image-batch-tool | R e2e 600×800 lu dans le JPEG (audit) | **Vérifié** | — | — | — |
| Lire et supprimer les métadonnées EXIF | `/images/metadonnees-exif/` | — | U strip JPEG/PNG · R e2e EXIF injecté puis absent (audit) | **Vérifié** | Autres formats réencodés | — | — |
| Ajouter un filigrane sur une image | `/images/filigrane/` | image-batch-tool | R e2e PNG modifié, taille conservée (audit) | **Vérifié** | Texte seulement | Rendu visuel non vérifié | — |
| Compteur de mots | `/texte/compteur-de-mots/` | — | U stats · R e2e « Mots 7 » | **Vérifié** | — | — | — |
| Majuscules et minuscules | `/texte/majuscules-minuscules/` | — | U changeCase · R e2e phrase/kebab (audit) | **Vérifié** | — | — | — |
| Nettoyer un texte | `/texte/nettoyer-un-texte/` | — | U cleanText · R e2e | **Vérifié** | — | — | — |
| Comparer deux textes | `/texte/comparer-deux-textes/` | — | U computeDiff · R e2e « chien », +5 | **Vérifié** | — | — | — |
| Générateur de slug URL | `/texte/generateur-de-slug/` | — | U slugify · R e2e | **Vérifié** | — | — | — |
| Formater et valider du JSON | `/developpeur/formater-valider-json/` | json-tool | U parser · R e2e erreur ligne/colonne, sortie | **Vérifié** | — | — | — |
| Convertir CSV en JSON | `/developpeur/csv-vers-json/` | json-tool (CsvToJson) | U csv · R e2e champs cités (audit) | **Vérifié** | — | — | — |
| Encoder et décoder en Base64 | `/developpeur/encoder-decoder-base64/` | encoder-tool (base64) | U · R e2e encode/décode UTF-8, erreur | **Vérifié** | — | — | — |
| Encoder et décoder une URL | `/developpeur/encoder-decoder-url/` | encoder-tool (url) | U · R e2e %C3%A9 | **Vérifié** | — | — | — |
| Échapper et déséchapper du HTML | `/developpeur/caracteres-html/` | encoder-tool (html) | U · R e2e entités | **Vérifié** | Déséchappement regex | — | — |
| Générateur d'UUID | `/developpeur/generateur-uuid/` | — | U format v4 · R e2e 5 UUID, régénération | **Vérifié** | — | — | — |
| Générateur de mots de passe | `/developpeur/generateur-de-mot-de-passe/` | — | U classes requises · R e2e longueur 16 | **Vérifié** | Entropie théorique | — | — |
| Calculer un hash SHA-256 / SHA-1 / SHA-512 | `/developpeur/calculer-hash-sha256/` | — | U SHA-256 · R e2e abc → ba7816bf…, comparaison | **Vérifié** | Pas de MD5 | — | — |
| Testeur d'expressions régulières | `/developpeur/testeur-regex/` | — | U matches/groupes · R e2e 2 correspondances, erreur | **Vérifié** | Regex pathologiques | — | — |
| Convertisseur de timestamp Unix | `/developpeur/convertisseur-timestamp/` | — | U parse/describe · R e2e ISO exact | **Vérifié** | Fuseau local | — | — |
| Calculatrice de pourcentage | `/calculatrices/pourcentage/` | percent-tool | U · R e2e 30,00 et −25 % | **Vérifié** | — | — | — |
| Calculatrice de TVA | `/calculatrices/tva/` | percent-tool (VatTool) | U arrondis · R e2e 1 000 → 200 € | **Vérifié** | Arrondi par ligne | — | — |
| Jours entre deux dates et jours ouvrés | `/calculatrices/jours-entre-deux-dates/` | — | U Pâques, fériés, ouvrés · R e2e mai 2026 = 17 ouvrés | **Vérifié** | Fériés nationaux | — | — |
| Convertisseur d'unités | `/calculatrices/convertisseur-unites/` | — | U aller-retour toutes catégories · R e2e 10 m → 10 000 mm | **Vérifié** | — | — | — |
| Générateur de QR code | `/codes/generateur-qr-code/` | — | U payloads · R e2e PNG/SVG téléchargés | **Vérifié** | Statique | — | — |
| Lire un QR code depuis une image | `/codes/lire-un-qr-code/` | — | U décodage jsQR · R e2e URL lue, échec propre sur photo · caméra factice : photo sans code → message honnête (clôture) | **Vérifié** | Photo, pas de flux | Appareil réel non testé | Permissions-Policy bloquait la caméra → corrigé |
| Générateur de codes-barres | `/codes/generateur-code-barres/` | — | U tables, clés EAN, Code 128/39 · R e2e SVG/PNG, clé incorrecte | **Vérifié** | Non testé à la douchette | Lecture par scanner matériel non vérifiée | — |
| Convertisseur de couleurs et contraste | `/codes/convertisseur-couleurs/` | color-tool | U conversions, WCAG · R e2e rgb/hsl, contraste | **Vérifié** | CMYK approx. | — | — |
| Extraire la palette de couleurs d'une image | `/codes/palette-couleurs-image/` | color-tool (ImagePaletteTool) | U extractPalette · R e2e trois bandes pures → exactement #ff0000 #00ff00 #0000ff à ≈ 33 % (clôture) | **Vérifié** | Couleurs moyennes sur image réduite | Qualité perceptuelle sur photos non mesurée | — |
| Convertir du Markdown en PDF | `/documents/markdown-vers-pdf/` | markdown-pdf-tool | U titres/listes/tables/liens · R e2e texte et table dans le PDF | **Vérifié** | Polices standard, images ignorées | — | — |
| Convertir un texte en PDF | `/documents/texte-vers-pdf/` | markdown-pdf-tool (mode text) | U pagination/numéros · R e2e « 1 page » | **Vérifié** | — | — | — |
| Feuilles à imprimer : quadrillé, ligné, pointillé, Seyès | `/documents/feuilles-a-imprimer/` | printables-tool | U géométrie : nombre de lignes, espacement 5 mm exact, marges (clôture) · R e2e flux de contenu du PDF téléchargé relu, 2 pages (clôture) | **Vérifié** | Imprimer à 100 % | Rendu imprimante non mesuré | — |
| Calendrier à imprimer (mois ou année) | `/documents/calendrier-a-imprimer/` | printables-tool | U mois/année, fériés · R e2e « 2027 » dans le PDF | **Vérifié** | — | — | — |
| Page de garde PDF | `/documents/page-de-garde/` | printables-tool | U texte présent · R e2e titre dans le PDF | **Vérifié** | Mise en page unique | — | — |

## 5. Vérifications transversales

### Fichiers invalides, vides, volumineux, limites

| Cas | Vérifié par | Résultat |
| --- | --- | --- |
| Fichier vide (0 octet) sur une zone PDF ou image | e2e | Refusé avec message (« PDF valide » / « fichier vide ») |
| Fichier `.txt` sur une zone PDF, sur l'OCR | e2e | Refusé |
| Fichier nommé `.pdf` au contenu non PDF | e2e | Détecté après lecture (signature `%PDF`), panneau d'erreur |
| PDF corrompu | e2e (compresser, vérifier) | Erreur claire, aucun fichier produit ; diagnostic « Problèmes détectés » |
| PDF chiffré sur un outil pdf-lib (fusion) | e2e | Fichier exclu avec message « mot de passe » |
| Taille > 100 Mo, > 30 fichiers, > 1 000 pages, 0 page | U (`validatePdfFileMeta`, `validateFileBatch`, `assertPageCount`) | Refusés avec codes distincts ; **pas testé de bout en bout** (fichier de 100 Mo non généré en CI) |
| Limite 500 pages de la comparaison | code revu | N'était pas appliquée → corrigée |
| 200 pages OCR, 100 pages scanner, 50 images par lot | code revu | Appliquées (troncature annoncée pour l'OCR, toast pour les lots) ; non testées e2e |

### Accessibilité, clavier, états, mobile

- axe-core 4.14 (règles WCAG 2.1 A/AA + bonnes pratiques) sur 13 pages et 2 états chargés : 0 violation
  sérieuse/critique après corrections. Constats mineurs/modérés résiduels : aucun signalé par axe sur ces pages.
- Clavier : lien d'évitement, raccourci Ctrl+K avec focus dans la recherche et fermeture par Échap, bouton de
  dépôt accessible au Tab et ouvrant le sélecteur de fichiers par Entrée, menu mobile piégeant le focus et le
  restituant au bouton. Non testé : navigation clavier complète dans l'éditeur (déplacement des annotations).
- États : panneau occupé `role=status aria-live`, panneau d'erreur `role=alert` avec reprise ; vérifiés e2e.
- Mobile (émulation Pixel 7) : toute la suite e2e s'exécute aussi en mobile ; balayage de 13 pages d'outils sans
  débordement horizontal ; dessin tactile des rectangles de caviardage via événements pointeur. Non testé :
  appareil réel, caméra, glisser-déposer tactile de dnd-kit (clavier testé).

### Dépendances WebAssembly, poids, chargement

| Actif | Poids servi | Chargé quand | Vérifié |
| --- | --- | --- | --- |
| pdf.js (`/pdfjs/`, worker + cmaps + polices) | 5,2 Mo sur disque ; worker ≈ 1 Mo téléchargé | Première page outil PDF | e2e |
| Tesseract worker + core `*.wasm.js` (3 variantes, une téléchargée) | ≈ 3,9 Mo | Clic « Lancer la reconnaissance » | e2e confidentialité (liste des requêtes) |
| Modèles OCR `fra` / `eng` | 6,3 Mo / 10,9 Mo | Idem, selon la langue | e2e (fra) |
| qpdf WebAssembly | 1,3 Mo | Clic protéger / déverrouiller / vérifier | e2e |

JavaScript transféré par route (build de production, octets non compressés, mesure Playwright) : accueil ≈ 940 ko
(Next/React/Radix + catalogue), pages texte/calculs ≈ 950–1 000 ko, pages PDF/OCR/scanner ≈ 1 400–1 500 ko
(pdf.js, pdf-lib et dnd-kit chargés à la demande). Aucune bibliothèque lourde n'est chargée sur l'accueil ; les
bundles d'outils ne se chargent que sur leur page. Temps de chargement local (réseau nul) ≈ 1 s par page ;
aucune mesure sur réseau mobile réel.

Licences des dépendances d'exécution ajoutées : Apache-2.0 (tesseract.js, tesseract.js-core, modèles, jsqr,
pdf.js), MIT (qrcode, exifr, marked, pdf-lib…), ISC (qpdf-wasm ; qpdf lui-même Apache-2.0), BSD-3-Clause (diff),
MPL-2.0/Apache-2.0 (dompurify). Ajout dev uniquement pour l'audit : axe-core (MPL-2.0). Aucune licence copyleft
forte dans le bundle livré.

### Confidentialité

- Revue du code : aucun `fetch`/`XMLHttpRequest`/`sendBeacon` hors analytics optionnel ; `localStorage` utilisé
  uniquement pour le consentement (et le thème par next-themes) ; CSP `connect-src 'self'` par défaut.
- e2e : 0 requête hors origine, 0 requête avec corps, 0 cookie, 0 IndexedDB pendant fusion, compression, QR,
  OCR et protection ; le mot de passe saisi n'apparaît dans aucune requête.
- Liens externes volontaires : carte OpenStreetMap depuis l'outil EXIF (coordonnées GPS dans l'URL, clic
  explicite, libellé « site externe ») et lien lu dans un QR code (ouverture manuelle, avertissement).
- Événements analytics : liste blanche de propriétés (jamais de nom de fichier ni de contenu), inactifs sans
  fournisseur et sans consentement.

## 6. Fonctionnalités vérifiées, partiellement vérifiées

**Vérifiées (résultat relu)** : les 60 outils marqués « Vérifié » dans la matrice, dont l'OCR sur image et sur
PDF scanné (texte attendu reconnu, PDF recherchable relu), la protection (permissions réellement écrites,
AES-128 et 256, mot de passe unique, propriétaire seul), le déverrouillage autorisé (mauvais mot de passe
refusé, bon mot de passe → fichier non chiffré sans restriction), le caviardage (texte réellement absent du
fichier, page pivotée conservant son orientation, métadonnées supprimées), la numérisation (PDF multipage,
filtre N&B produisant deux tons), la fidélité des options (dpi, formats, rotation, numérotation, recadrage).

**Partiellement vérifiées** : plus aucune après la clôture (section 8). Les six outils concernés sont vérifiés sur
le fichier produit ; les éléments qui restent hors de portée des tests automatiques (rendu à l'impression, qualité
perceptuelle d'une palette sur photo) sont listés comme risques ouverts.

## 7. Risques encore ouverts (état après la clôture, section 8)

1. **Caméra sur appareil réel** : le flux complet est vérifié avec le périphérique factice de Chromium (et le
   blocage par `Permissions-Policy` a été corrigé), mais ni iOS Safari ni Android Chrome réels n'ont été
   exécutés : procédure manuelle en 8.4.
2. **Navigateurs** : Chromium uniquement. Safari et Firefox n'ont pas pu être installés (proxy). Les pièges
   connus (encodage WebP absent sur Safari, variante SIMD du moteur OCR) sont couverts par des scénarios
   reproductibles ; le reste relève de la procédure manuelle 8.4.
3. **Mobiles bas de gamme** : un PDF de 60 Mo est traité en ≈ 3 s avec un tas JS de ≈ 257 Mo sur la machine
   de test ; aucune mesure sur un téléphone d'entrée de gamme. pdf-lib et les filtres d'image tournent sur
   le thread principal.
4. **OCR** : qualité mesurée sur une seule image imprimée nette ; scans réels (bruit, inclinaison, colonnes)
   non évalués.
5. **Codes-barres** : conformité vérifiée par calcul (clés, sommes, longueurs), pas par un lecteur matériel.
6. **Caviardage** : dépend de la relecture humaine ; la recherche automatique ignore les scans.
7. **Diagnostic qpdf** : les messages détaillés ne sont disponibles que dans le navigateur ; les tests Node
   s'appuient sur les codes de sortie et les heuristiques.
8. **Déverrouillage** : la case « je suis autorisé » est déclarative ; l'outil ne peut pas vérifier le droit
   de l'utilisateur (documenté sur la page).
9. **Impression des feuilles** : exactitude millimétrique dépendante du réglage « 100 % » de l'imprimante.
10. **Performance réseau** : poids mesurés en local ; aucune mesure Lighthouse ni sur 4G.

## 8. Clôture des risques fonctionnels

Objectif : fermer les points « partiel » et « ouvert » de l'audit sans ajouter de fonctionnalité ni préparer la
production. Résultats réellement obtenus ; chiffres finaux : `pnpm test` 136 tests (14 fichiers) · `pnpm test:e2e`
92 parcours × 2 projets = 175 exécutions vertes, 9 ignorées volontairement · typecheck et lint sans erreur.

### 8.1 Résultat réel des six outils partiellement vérifiés (`e2e/closure.spec.ts`, `tests/unit/audit-deep.test.ts`)

| Outil | Ce qui est relu dans le fichier produit | Résultat |
| --- | --- | --- |
| Annoter | Texte du commentaire extrait par pdf.js ; flux de contenu de la page 1 : chemins et remplissages ajoutés, état graphique de transparence (`/GS… gs`) du surlignage ; pages 2–3 identiques à l'original octet pour octet | Vérifié |
| Ajouter du texte | Texte saisi sur la page 2 présent dans la page 2, absent des pages 1 et 3 | Vérifié |
| Redimensionner | Dimensions lues dans l'en-tête JPEG téléchargé pour quatre méthodes : largeur 400 → 400×300, 25 % → 200×150, exact → 300×300, tenir dans 1000×150 → 200×150 | Vérifié |
| Recadrer une image | Image synthétique rouge/bleu ; recadrage (0,0,200,100) → PNG 200×100 dont tous les pixels échantillonnés sont rouges ; (200,100,200,100) → tous bleus | Vérifié |
| Palette | Image synthétique à trois bandes pures → exactement `#ff0000`, `#00ff00`, `#0000ff`, parts 32–34 %, variables CSS | Vérifié |
| Feuilles à imprimer | Flux de contenu du PDF téléchargé (quadrillé 5 mm, 2 pages) : nombre de lignes horizontales et verticales attendu, espacement 14,17 pt (5 mm) à 0,01 pt, première ligne à la marge ; unitaire : idem sur chaque page, ligné = horizontales seulement, pointillé = arcs seulement | Vérifié |

### 8.2 Gros fichiers et limites (scénarios reproductibles, `e2e/closure.spec.ts`)

| Scénario | Résultat mesuré |
| --- | --- |
| PDF de 101 Mo (écrit sur disque, Playwright refusant les tampons > 50 Mo) | Refusé avant lecture avec le message « 100 Mo », aucun fichier chargé |
| PDF de 1 001 pages | Refusé : « dépasse la limite de 1000 pages » |
| PDF de 60 Mo (pièce jointe aléatoire incompressible, 20 pages) → Pivoter | Chargé, pivoté et téléchargé en ≈ 2,3–3,2 s ; sortie 60 Mo valide, rotation 90° ; tas JS ≈ 257 Mo |
| 51 images d'un coup | 50 acceptées, avertissement « 1 fichier(s) ignoré(s) » |
| Image PNG de 20 Mpx (5000×4000) → Compresser | Décodée et traitée ; plafond par défaut de 2048 px appliqué (2048×1638), ratio conservé |

Non exécuté : OCR sur 200 pages, scanner à 100 pages, PDF de 100 Mo avec contenu réel (images) de bout en
bout, mesure de mémoire sur un téléphone.

### 8.3 Compatibilité : ce qui a été testé, ce qui ne l'a pas été

- **Testé (Chromium, scénarios reproductibles)** : navigateur sans encodeur WebP simulé (`toBlob`/`toDataURL`
  renvoient du PNG, comme Safari) → l'option WebP est désactivée avec la mention « Non pris en charge par ce
  navigateur », le mode « identique » retombe sur PNG, et `encodeCanvas` refuse de livrer un fichier dont le type
  ne correspond pas à l'extension ; les trois variantes du moteur OCR (sans SIMD, SIMD, relaxed SIMD) et les deux
  modèles sont servis avec un code 200 et une taille cohérente, ce qui garantit le repli choisi à l'exécution par
  `wasm-feature-detect` sur Safari/Firefox ; téléchargement d'un fichier au nom dangereux (`../`, `<>`, `:`) →
  nom assaini, PDF valide ; caméra factice : voir 8.4.
- **Non testé** : Safari (macOS, iOS), Firefox, Edge, appareils réels. Le téléchargement des navigateurs
  Playwright (`cdn.playwright.dev`, `playwright.download.prss.microsoft.com`) est refusé par le proxy de
  l'environnement.

### 8.4 Caméra : testé avec un périphérique factice, procédure pour appareils réels

Ce qui est testé (`e2e/camera.spec.ts`, Chromium avec `--use-fake-device-for-media-stream`) : ouverture du
dialogue, flux affiché, déclencheur activé, deux prises de vue ajoutées comme pages, export PDF à 2 pages, arrêt
des pistes à la fermeture ; lecteur de QR : photo sans code → « Aucun QR code lisible » ; refus de permission →
message explicite, déclencheur désactivé, import toujours disponible. Ce scénario a révélé que l'en-tête
`Permissions-Policy: camera=()` bloquait `getUserMedia` sur tout le site (corrigé en `camera=(self)`, test
unitaire de l'en-tête ajouté). **Ceci n'est pas un test de caméra physique.**

Procédure manuelle (à exécuter sur l'hébergement HTTPS, pas en local HTTP) :

1. iPhone (Safari iOS ≥ 16) et Android (Chrome récent) : ouvrir `/numerisation/scanner-un-document/`, toucher
   « Prendre une photo avec la caméra », accepter la permission ; vérifier que l'aperçu est la caméra arrière,
   que « Changer de caméra » bascule, que le déclencheur ajoute une page, que fermer puis rouvrir redemande
   éventuellement la permission sans erreur. Exporter en PDF et ouvrir le fichier téléchargé (iOS : vérifier
   l'ouverture dans Fichiers ou l'aperçu Safari).
2. Refuser la permission : le message « Accès à la caméra refusé » doit s'afficher et « Importer des photos »
   doit ouvrir l'appareil photo natif (attribut `capture`).
3. `/codes/lire-un-qr-code/` : photographier un QR code imprimé ; le contenu doit s'afficher sans ouverture
   automatique du lien.
4. Sur Safari macOS et Firefox : `/images/compresser/` doit afficher WebP désactivé sur Safari (actif sur
   Firefox) ; `/numerisation/ocr/` sur une image de texte : vérifier dans l'onglet réseau que le fichier
   `tesseract-core-simd-lstm.wasm.js` (Safari) ou `relaxedsimd` (Firefox récent) est chargé depuis le site et
   que le texte est reconnu ; `/pdf/fusionner/` : vérifier que le téléchargement démarre (iOS Safari peut
   ouvrir le PDF dans un onglet : utiliser « Partager → Enregistrer dans Fichiers »).

### 8.5 Problèmes confirmés et corrigés pendant la clôture

| Problème | Gravité | Correctif | Régression |
| --- | --- | --- | --- |
| `Permissions-Policy: camera=()` interdisait la caméra sur toutes les pages : scanner et lecteur de QR ne pouvaient jamais ouvrir la caméra en production | Bloquant (fausse promesse fonctionnelle) | `camera=(self)` ; microphone, géolocalisation, paiement et USB restent interdits | `tests/unit/security.test.ts`, `e2e/camera.spec.ts` |
| Option WebP proposée même quand le navigateur ne sait pas l'encoder (Safari) ; « identique » sur une source WebP aurait échoué | Moyen (erreur au lieu d'un fichier) | Détection `supportsWebpEncoding()`, option désactivée avec mention, repli PNG pour « identique » | `e2e/closure.spec.ts` (navigateur sans WebP simulé) |

### 8.6 Ce qui reste impossible à vérifier dans cet environnement

- Safari, Firefox, Edge et tout appareil physique (voir procédure 8.4).
- Caméra physique, orientation EXIF des photos de téléphone, performance sur mobile bas de gamme.
- Impression réelle des feuilles (échelle 100 %) et lecture des codes-barres par une douchette.
- Mémoire et durée sur des documents de 100 Mo riches en images, OCR sur 200 pages.
