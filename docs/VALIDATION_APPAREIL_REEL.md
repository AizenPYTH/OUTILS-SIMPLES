# Procédure de validation sur appareil réel (scanner, caméra, OCR)

L'environnement de développement n'a ni caméra physique, ni téléphone, ni Safari, ni Firefox :
les parcours caméra sont vérifiés avec le **périphérique factice de Chromium** (mire verte animée),
sur desktop et avec l'émulation Pixel 7. Ce qui suit doit être fait par une personne, sur de vrais
appareils, avant toute mise en production. Noter pour chaque point : appareil, navigateur, résultat.

## 0. Préalable

- Le site doit être servi en **HTTPS** (la caméra est refusée en HTTP, sauf `localhost`).
- Appareils conseillés : un iPhone récent (Safari), un Android (Chrome), un Android d'entrée de
  gamme (2–3 Go de mémoire), un Mac (Safari), un PC (Firefox).

## 1. Scanner (`/numerisation/scanner-un-document/`)

1. Ouvrir la page, toucher « Prendre une photo avec la caméra ». Attendu : demande d'autorisation
   puis aperçu **de la caméra arrière**, plein écran, sans déformation (bandes noires acceptées).
2. Refuser l'autorisation une fois : message « Accès à la caméra refusé… », bouton Importer utilisable.
3. Toucher le déclencheur. Attendu **immédiatement** : la photo figée plein cadre, boutons
   « Reprendre » et « Garder cette page ». Vérifier que la photo est celle du cadrage (pas tournée,
   pas en miroir, pas recadrée).
4. « Reprendre » puis déclencher à nouveau, « Garder » : compteur « 1 page », retour à la caméra.
   Prendre une seconde page, « Garder », puis « Terminer ».
5. Sur la page : l'aperçu montre la photo **en couleur, telle quelle** (filtre « Couleur »
   sélectionné). Essayer Gris, Noir et blanc, Document, puis revenir à Couleur : l'original est
   intact.
6. « Redresser » : les quatre coins proposés entourent la feuille (sur fond contrasté) ; les ajuster
   au doigt ; « Appliquer » : page rectangulaire. « Recadrer » : cadre déplaçable au doigt.
7. Pivoter, réordonner les deux pages par glisser, supprimer une page, en reprendre une.
8. « Créer le PDF (2 pages) » puis télécharger : ouvrir le PDF dans le lecteur du téléphone,
   vérifier l'ordre, l'orientation et la netteté. Exporter aussi en JPG.
9. Importer une photo existante prise en mode **portrait** par le téléphone : elle doit apparaître
   droite (orientation EXIF respectée).
10. Mémoire : répéter avec 10 pages sur l'Android d'entrée de gamme ; noter tout rechargement de page.

## 2. Lecteur de QR code (`/codes/lire-un-qr-code/`)

Photographier un QR imprimé : aperçu, « Garder », contenu lu ; un lien doit afficher l'avertissement
avant ouverture. Photographier une feuille sans code : message honnête.

## 3. OCR (`/numerisation/ocr/`)

1. Photographier avec le téléphone une page imprimée **droite**, puis l'importer : texte lu à
   l'endroit, confiance > 80 %, zones vertes.
2. La même page **tournée de 90°** et **à l'envers** : en mode Automatique, le texte doit être lu ;
   l'aperçu indique « Texte lu à 90° » (ou 180°). Sinon choisir l'orientation dans les options
   avancées.
3. Une étiquette de colis réelle (zones à 0° et 90°) : vérifier « Orientations mixtes », le texte
   des deux zones, puis le PDF recherchable : sélection des mots dans le lecteur **dans le sens du
   texte**, recherche d'un mot de la zone tournée.
4. Une photo légèrement de travers (2–5°) : « Inclinaison corrigée » affichée, texte correct.
5. Temps par page sur chaque appareil (noter) ; comportement si l'on quitte la page pendant l'OCR.

## 4. Éditeur PDF (`/pdf/modifier/`)

Sur tablette ou téléphone : zoom par les boutons, défilement, « Modifier le texte » sur un passage
droit et sur un passage tourné (le champ suit le sens du texte), export, ouverture dans le lecteur
natif, recherche du nouveau mot.

## 5. Safari et Firefox (desktop)

Parcourir : accueil, catalogue, un outil PDF (fusion), scanner (import), OCR (image), éditeur
(texte ajouté + export). Points connus à surveiller : encodeur WebP absent sur Safari (repli JPEG
prévu), variante SIMD du moteur OCR (repli prévu), `createImageBitmap` avec `imageOrientation`.

## 6. Version anglaise (toutes plateformes)

Rien de ce qui suit n'a été vérifié sur un appareil réel : l'anglais a été testé avec Playwright
(Chromium desktop et émulation Pixel 7) uniquement.

1. Ouvrir `/en/` : interface, accueil et pied de page en anglais ; aucun texte français visible.
2. Sélecteur FR/EN (en-tête sur ordinateur, menu sur mobile) : depuis `/en/pdf/merge/`, passer en
   français doit ouvrir `/pdf/fusionner/` et inversement ; depuis un guide, son équivalent.
3. `/en/pdf/merge/` : déposer deux PDF, fusionner, télécharger ; tous les libellés, messages de
   progression et d'erreur (fichier non PDF, mot de passe) doivent être en anglais.
4. `/en/pdf/edit/` : ouvrir un PDF, utiliser texte, formes, signature, pages, export ; raccourcis
   clavier (aide `?`) en anglais ; les menus contextuels aussi.
5. `/en/scanning/ocr/` sur téléphone : la langue de reconnaissance « English » doit être
   proposée ; vérifier que le modèle anglais se télécharge (connexion requise la première fois).
6. Hors ligne : enregistrer un outil anglais (« Use offline »), couper le réseau, recharger ; une page
   anglaise jamais visitée doit mener à `/en/offline/`, pas à `/hors-ligne/`.
7. Lecteur d'écran (VoiceOver iOS / NVDA) : le sélecteur de langue annonce « Français » / « English »,
   la page annonce la langue (`lang`) et les états « busy » / erreurs en anglais.
