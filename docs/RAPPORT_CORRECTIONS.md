# OUTILIA — Rapport : corrections ciblées et simplification du design

Principes de design et application page par page : `docs/DESIGN_PRINCIPES.md`.
Étude et limites de l'édition du texte existant : `docs/EDITION_TEXTE.md`.

## 1. Changements effectués

### Interface (simplification)
- **Accueil `/`** : un titre, une phrase, un seul champ de recherche (→ `/outils/?q=`), la mention
  « Vos fichiers restent chez vous », 9 outils populaires, 8 familles d'outils avec leur nombre
  d'outils, un bouton « Voir tous les outils », le bloc « Comment ça marche » en trois étapes.
- **Catalogue `/outils/`** : vraie page (plus une redirection) avec recherche, filtres de catégorie
  et sections par catégorie ; reçoit `?q=` de l'accueil et de la recherche de l'en-tête ; ajoutée
  au sitemap. Les pages de catégorie gardent le même composant.
- **En-tête** : logo · Outils · Guides · recherche · langue · thème. Les huit catégories et le
  bouton « Éditeur PDF » quittent la barre (ils débordaient dès 1 366 px) ; elles sont dans le menu
  mobile (lignes de 44 px avec icône et compte) et sur `/outils/`.
- **Cartes d'outil** : un seul modèle (icône, nom, deux lignes de description).
- **Pages d'outil** : fil d'Ariane, H1 réduit, résumé d'une ligne, puis **la zone d'action** ;
  badges sous l'outil ; la description complète est conservée dans une section « À propos de cet
  outil » (contenu SEO inchangé, FAQ et JSON-LD inchangés).

### Éditeur PDF (rendu)
- **Netteté** : le canvas a désormais un nombre entier de pixels et sa taille CSS est dérivée de ce
  nombre (`backing / ratio`), au lieu d'arrondir la taille CSS : sur un écran 2,625×, le rapport
  mesuré passe de 2,6236 (rééchantillonnage flou) à 2,625. Le rendu est recalculé à chaque zoom
  (jusqu'à 400 %) avec la densité de pixels de l'écran, plafonné à 16 Mpx par page.
- **Taille** : ajustement à la largeur disponible, plafonné à 1,3 × la hauteur visible. Mesuré
  sur 1 366 × 860 : page de 457 px → 654 px de large ; sur Pixel 7 : pleine largeur (378 px).
- Portrait et paysage passent par la taille visuelle de la page (rotation `/Rotate` incluse),
  vérifiée par le test sur le fichier à page pivotée.

### Éditeur PDF (texte existant) — nouveau
- Outil **« Modifier le texte »** (distinct d'« Ajouter du texte », des dessins, de la signature) :
  clic sur un passage, champ en place, Entrée. Le passage est **remplacé dans le flux de contenu**
  de la page (même position, même couleur), avec la **police d'origine** quand elle contient les
  caractères, sinon une police standard proche pour ce passage, signalée à l'écran. Aucun
  rectangle blanc : l'ancien texte n'existe plus dans le fichier (vérifié par test).
- La page est **réaffichée à partir du fichier réellement modifié** après chaque validation ;
  retour au texte d'origine passage par passage.
- Document scanné : message explicite et lien vers l'outil OCR. Texte invisible, police Type 3,
  écriture verticale, structure inhabituelle : passage non modifiable, raison affichée.
- Textes du registre et FAQ de l'outil mis à jour (plus de « Non » à la question « Puis-je
  modifier le texte existant ? », mais la liste exacte des cas pris en charge).

### Scanner mobile
- **Cause 1 (« la page apparaît en noir et blanc dégradé »)** : le réglage par défaut appliquait
  le filtre « Document » à toute photo dès son ajout ; ce filtre divise chaque pixel par le fond
  local et **produit une image grise**. Corrigé : filtre « Couleur » (photo d'origine) par défaut,
  contraste 0 ; les filtres restent des choix explicites, recalculés à partir de la photo d'origine
  qui n'est jamais modifiée.
- **Cause 2 (« le déclencheur ne fait rien »)** : la photo était ajoutée derrière le dialogue
  caméra, qui restait ouvert sans aucun retour visuel. Corrigé : **aperçu plein cadre** de la photo
  prise avec « Reprendre » / « Garder cette page », compteur de pages dans le dialogue, bouton
  « Terminer ». L'aperçu caméra est en `object-contain` : ce qui est vu est ce qui est capturé.
- Erreurs affichées (caméra refusée, indisponible, image pas encore disponible, encodage
  impossible) ; l'import de photos reste le repli.
- **Redresser** (quatre coins, détection automatique puis ajustement) ajouté sur la page du
  scanner, à côté de Recadrer / Pivoter ; filtres Couleur / Gris / Noir et blanc / Document ;
  pages réordonnables et supprimables ; PDF multipage (inchangé).
- Le lecteur de QR code passe aussi par l'aperçu « Garder ».

## 2. Bugs corrigés
| # | Bug | Cause réelle | Correction |
| --- | --- | --- | --- |
| 1 | Éditeur : document flou sur écran haute densité | Arrondi de la taille CSS du canvas → rapport non entier | Taille CSS dérivée du nombre entier de pixels |
| 2 | Éditeur : document trop petit | Ajustement à la hauteur, plafonné | Ajustement à la largeur, plafond 1,3 × hauteur, zoom 400 % |
| 3 | Scanner : page « dégradée noir et blanc » | Filtre « Document » (gris) appliqué par défaut | Filtre « Couleur » par défaut, choix explicite |
| 4 | Scanner : déclencheur « sans effet » | Aucun retour visuel, dialogue restant ouvert | Aperçu Garder / Reprendre, compteur, Terminer |
| 5 | Scanner : cadrage trompeur | Aperçu `object-cover` recadrait l'image affichée | `object-contain` |
| 6 | En-tête desktop : recherche réduite à un cercle, catégorie coupée | Trop d'éléments | Navigation courte |
| 7 | Éditeur : « Puis-je modifier le texte ? » → « Non » | Fonction absente | Édition réelle implémentée, limites écrites |

## 3. Tests réellement exécutés
- `pnpm typecheck`, `pnpm lint`, `pnpm build` : OK.
- `pnpm test` (Vitest, Node) : **146 tests** (136 + 10 nouveaux) : tokenizer, collecte des
  opérateurs, encodage original / repli, application sur PDF généré (ancien texte absent, nouveau
  texte extrait par pdf.js, aucun rectangle), extraction des passages sur fixtures (positions,
  codes y compris caractères non vus sur la page, indices stables après modification, page
  pivotée, page image → « scanné »).
- Playwright (Chromium desktop + Pixel 7 émulé) : voir le résultat en fin de ce rapport.
  Nouveaux parcours : recherche de l'accueil → catalogue ; catalogue et filtres sur `/outils/` ;
  navigation par les cartes de catégories ; édition de texte dans l'éditeur (boîte sur le texte,
  modification, réaffichage, retour, repli de police, export relu par pdf.js, aucun rectangle
  blanc, autres pages intactes) ; page scannée → message + lien OCR ; scanner : aperçu /
  reprendre / garder, compteur, couleurs d'origine conservées (pixel vert du périphérique
  factice), redressement, filtres, PDF à deux pages.
- Mesures prises dans Chromium (script) : rapport canvas/CSS mobile 2,6249983 ≈ 2,625 ; page de
  l'éditeur 654 px de large sur 1 140 px disponibles (desktop), pleine largeur sur mobile.

## 4. Ce qui n'a pas pu être testé (dit honnêtement)
- **Aucun téléphone réel ni caméra physique** : la caméra est vérifiée avec le périphérique
  factice de Chromium (mire verte). Procédure manuelle dans `docs/AUDIT_QUALITE.md` § procédure
  manuelle ; points à vérifier sur un vrai appareil : orientation de la vidéo arrière, première
  image après `play()`, taille de la photo (2560 × 1920 demandés), temps de « Garder ».
- **Safari / Firefox** : non installables ici (téléchargement bloqué).
- **Sites de référence** (Smallpdf, iLovePDF, PDF24, outils-simples.vercel.app) : inaccessibles
  depuis l'environnement (proxy réseau) ; aucune analyse de leurs interfaces actuelles n'a été
  faite, voir `docs/DESIGN_PRINCIPES.md` § 1.
- Édition de texte sur des PDF de production variés (polices composites non Identity, Type 3,
  formulaires) : seuls les fixtures du dépôt et des PDF générés ont servi ; les cas non pris en
  charge sont détectés et annoncés, pas devinés.

## 5. Limites restantes
- Édition de texte sans reflux (le texte qui suit ne bouge pas) ; crénage `TJ` remplacé par un
  `Tj` ; aperçu proportionnel à la taille du fichier (rechargement du document à chaque
  validation) ; Annuler / Rétablir ne couvrent pas ces modifications.
- Police de repli pour un caractère absent d'une police **sous-ensemble** (cas fréquent dans les
  documents bureautiques) : apparence différente sur ce passage, signalée.
- Scanner : filtres « Document » et « Noir et blanc » sans couleur par nature ; redressement
  géométrique uniquement.
- Les autres limites connues restent listées dans `docs/KNOWN_LIMITATIONS.md`.
