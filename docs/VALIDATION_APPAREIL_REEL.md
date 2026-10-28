# Validation sur appareils réels avant publication

**Rien de ce document n'a été exécuté sur un appareil réel.** L'environnement de développement n'a
ni téléphone, ni caméra physique, ni Safari, ni Firefox : tout ce qui suit a seulement été vérifié
avec Chromium (bureau et émulation Pixel 7) par les tests Playwright. Cette procédure est à
dérouler par une personne sur le **déploiement de prévisualisation** (`NEXT_PUBLIC_NOINDEX=true`,
`docs/PLAN_LANCEMENT.md` §1), avant de rendre le site public. Durée indicative : 1 h 30 à 2 h.

## 0. Préparation

| Élément              | Détail                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adresse              | L'URL HTTPS de prévisualisation (la caméra est refusée en HTTP).                                                                                                                                                                                                                                                                                                                                      |
| Appareils            | **A** : iPhone récent, Safari. **B** : téléphone Android, Chrome (idéalement aussi un modèle d'entrée de gamme, 2–3 Go de mémoire). **C** : ordinateur, Firefox à jour. Facultatif : Mac + Safari, PC + Edge.                                                                                                                                                                                         |
| Fichiers de test     | Copier sur chaque appareil le dossier `tests/fixtures/` du dépôt, en particulier : `simple-3-pages.pdf`, `simple-5-pages.pdf`, `protected-user.pdf` (mot de passe `secret42`), `corrupted.pdf`, `not-a-pdf.txt`, `office-sample.docx`, `office-sample.xlsx`, `scan-text.pdf`, `text-french.png`, `photo-sample.heic`, `qr-averopdf.png`. Ajouter une vraie photo de document prise avec le téléphone. |
| Lecteurs de résultat | Le lecteur PDF du système (Fichiers sur iOS, lecteur Google ou Adobe sur Android, navigateur ou Acrobat sur ordinateur) et Word ou LibreOffice pour le `.docx`.                                                                                                                                                                                                                                       |
| Fiche de résultats   | Une ligne par contrôle : appareil, navigateur et version, langue, contrôle, résultat (OK / KO / non applicable), capture, remarque.                                                                                                                                                                                                                                                                   |

## 1. Règles de décision

- **Bloquant** (ne pas publier) : une action principale impossible (dépôt, traitement,
  téléchargement, export du modificateur), un fichier produit qui ne s'ouvre pas ou qui est faux
  (pages manquantes, ordre faux, texte perdu), une page blanche ou une erreur JavaScript visible,
  un texte français sur une page anglaise (ou l'inverse) dans un parcours principal, une page légale
  avec un encadré « à compléter », un envoi de fichier vers un serveur (voir §2.9).
- **Non bloquant** (à noter et corriger après publication) : défaut visuel mineur, lenteur
  acceptable (traitement qui aboutit), libellé perfectible, comportement différent mais correct
  (par exemple WebP remplacé par JPEG sur Safari, prévu par le code).
- **Preuves à conserver** pour chaque contrôle : une capture d'écran du résultat (ou un court
  enregistrement d'écran pour le modificateur et le scanner), le fichier produit pour les contrôles
  de traitement, et la fiche de résultats remplie. Les conserver hors du dépôt public.

## 2. Contrôles

Faire chaque contrôle sur **A**, **B** et **C**, en français puis, pour les lignes marquées « EN »,
sur la page anglaise indiquée.

| #    | Contrôle (FR, puis EN si indiqué)                                                                                                                                                                                                                                           | Résultat attendu                                                                                                                                                                                                                                                                                      | Bloquant si…                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 2.1  | **Navigation** : `/`, menu (mobile : bouton menu), « Tous les outils », une famille, un outil, un guide, retour ; changer de langue avec FR/EN sur `/pdf/fusionner/`. EN : `/en/`.                                                                                          | Pages en moins de 3 s sur réseau mobile correct, aucun saut de mise en page gênant ; le sélecteur ouvre `/en/pdf/merge/` puis revient à `/pdf/fusionner/`.                                                                                                                                            | page blanche, lien mort, mauvaise langue, page équivalente non trouvée                |
| 2.2  | **Dépôt, traitement, téléchargement** : `/pdf/fusionner/` avec `simple-3-pages.pdf` + `simple-5-pages.pdf`, changer l'ordre, fusionner, télécharger, ouvrir. EN : `/en/pdf/merge/`.                                                                                         | Un PDF de 8 pages, dans l'ordre choisi, qui s'ouvre dans le lecteur du système ; libellés et messages dans la langue de la page.                                                                                                                                                                      | fichier absent, illisible ou dans le mauvais ordre                                    |
| 2.3  | **Erreurs** : déposer `not-a-pdf.txt`, puis `corrupted.pdf`, puis `protected-user.pdf` (mauvais mot de passe, puis `secret42`) sur `/pdf/fusionner/` et `/pdf/modifier/`. EN : `/en/pdf/merge/`.                                                                            | Un seul message clair par erreur, en ligne sous la zone de dépôt, dans la langue de la page ; le PDF protégé s'ouvre avec le bon mot de passe.                                                                                                                                                        | plantage, message absent ou technique, page bloquée                                   |
| 2.4  | **Compression** : `/pdf/compresser/` (`simple-5-pages.pdf`) et `/images/compresser/` (photo du téléphone).                                                                                                                                                                  | Taille avant/après affichée, fichier téléchargé qui s'ouvre ; l'image reste droite (orientation respectée).                                                                                                                                                                                           | fichier corrompu, photo tournée                                                       |
| 2.5  | **Modificateur PDF** : `/pdf/modifier/` avec `simple-3-pages.pdf` ; modifier un mot du texte existant, ajouter un texte, un rectangle, une signature tracée au doigt/à la souris ; pivoter une page ; zoom ; annuler/rétablir ; télécharger. EN : `/en/pdf/edit/`.          | Chaque action visible immédiatement ; tous les outils du rail accessibles (ordinateur 768 px de haut : icônes sur deux colonnes) ; sur téléphone, nom du fichier lisible et barre d'outils défilante ; le PDF exporté montre les modifications au bon endroit et le texte modifié est sélectionnable. | export impossible, modification absente ou mal placée dans le PDF, outil inaccessible |
| 2.6  | **OCR** : `/numerisation/ocr/` avec `text-french.png`, puis `scan-text.pdf`, puis une photo de page prise avec le téléphone ; créer le PDF recherchable. EN : `/en/scanning/ocr/` avec la langue « English ».                                                               | Texte reconnu lisible (premier lancement : téléchargement du moteur annoncé) ; dans le PDF recherchable, la recherche d'un mot fonctionne dans le lecteur du système. Noter le temps par page.                                                                                                        | moteur qui ne se charge pas, page bloquée, PDF recherchable illisible                 |
| 2.7  | **Scanner** (A et B) : `/numerisation/scanner-un-document/`, « Prendre une photo avec la caméra » (bouton principal sur téléphone), 2 pages, « Redresser », créer le PDF. EN : `/en/scanning/scan-a-document/`.                                                             | Caméra arrière, aperçu « Reprendre / Garder », PDF de 2 pages droites. Refuser l'accès à la caméra une fois : message clair, import toujours possible. Détail : annexe A.1.                                                                                                                           | caméra inutilisable sans alternative, PDF faux                                        |
| 2.8  | **Conversions** : `/conversion/word-vers-pdf/` (`office-sample.docx`), `/conversion/excel-vers-pdf/` (`office-sample.xlsx`), `/conversion/pdf-vers-word/` (`simple-3-pages.pdf`), `/images/convertir/` (`photo-sample.heic` vers JPEG). EN : `/en/conversion/word-to-pdf/`. | Fichiers produits qui s'ouvrent ; limites annoncées sur la page respectées (mise en page approchée pour PDF → Word).                                                                                                                                                                                  | fichier produit illisible ou vide                                                     |
| 2.9  | **Confidentialité** (C, outils de développement du navigateur, onglet Réseau) : refaire 2.2 et 2.6.                                                                                                                                                                         | Aucune requête vers un autre domaine ; aucune requête qui envoie le fichier (seuls des téléchargements de code et de modèles depuis le site).                                                                                                                                                         | toute requête sortante contenant le fichier                                           |
| 2.10 | **Hors ligne** : sur `/pdf/fusionner/`, « Utiliser hors ligne » (poids affiché dans le bouton) ; passer en mode avion ; recharger la page ; refaire 2.2. Ouvrir une page jamais visitée. EN : `/en/pdf/merge/` puis une page anglaise jamais visitée.                       | L'outil enregistré fonctionne sans réseau ; une page inconnue mène à `/hors-ligne/` (FR) ou `/en/offline/` (EN) ; la bannière hors connexion s'affiche.                                                                                                                                               | outil enregistré inutilisable hors ligne                                              |
| 2.11 | **Outils de formulaire rendus côté serveur** : `/codes/generateur-qr-code/`, `/developpeur/testeur-regex/`, `/developpeur/generateur-uuid/` (et EN `/en/codes/qr-code-generator/`).                                                                                         | La page apparaît directement avec l'outil (pas de bloc gris puis de saut) ; quelques secondes plus tard sur un téléphone lent, les champs deviennent utilisables ; un QR code téléchargé est lisible par un autre téléphone ; les UUID changent à chaque chargement.                                  | saisie perdue, outil qui reste inutilisable, QR code illisible                        |
| 2.12 | **Pages légales** : `/mentions-legales/`, `/confidentialite/`, `/conditions-utilisation/`, `/gestion-cookies/`, `/contact/` et `/en/legal-notice/`, `/en/privacy/`, `/en/terms/`, `/en/cookies/`, `/en/contact/` ; liens du pied de page.                                   | Identité de l'éditeur et de l'hébergeur renseignées, aucun encadré jaune « à compléter », adresse de contact réelle, liens fonctionnels.                                                                                                                                                              | un seul encadré « à compléter » ou une identité incomplète                            |
| 2.13 | **Affichage** : thème sombre (bouton soleil/lune et réglage du système), rotation du téléphone sur le modificateur, zoom texte du système à 130 %.                                                                                                                          | Contrastes lisibles, rien de coupé ni de superposé dans les parcours ci-dessus.                                                                                                                                                                                                                       | texte illisible ou bouton principal masqué                                            |
| 2.14 | **Lecteur d'écran** (VoiceOver sur A, TalkBack sur B, NVDA sur C si disponible) : `/` et `/pdf/fusionner/`.                                                                                                                                                                 | Langue de la page annoncée correctement ; boutons et zone de dépôt nommés ; erreurs annoncées.                                                                                                                                                                                                        | parcours de dépôt impossible au lecteur d'écran                                       |

## 3. Points connus à surveiller

- Safari : pas d'encodeur WebP (repli JPEG prévu) ; variante SIMD du moteur OCR remplacée par la
  version standard (prévue) ; `createImageBitmap` avec orientation EXIF.
- Android d'entrée de gamme : mémoire lors de l'OCR et du scanner sur 10 pages (noter tout
  rechargement de page).
- Premier chargement de l'OCR : plusieurs Mo de moteur et de modèle de langue (annoncé sur la page).
- Outils QR code, regex et UUID : visibles avant d'être utilisables (≈ 2 s sur un téléphone lent,
  mesuré en émulation) ; un toucher pendant cet intervalle n'a pas d'effet, c'est voulu (aucune
  saisie perdue).

## 4. Après la campagne

Joindre la fiche de résultats et les preuves au dossier de lancement. Tout contrôle **KO bloquant**
doit être corrigé puis re-testé sur l'appareil concerné avant la publication ; les KO non bloquants
deviennent des tickets après lancement.

## Annexe A. Parcours détaillés (scanner, QR, OCR, modificateur, Safari et Firefox)

### A.1 Scanner (`/numerisation/scanner-un-document/`)

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

### A.2 Lecteur de QR code (`/codes/lire-un-qr-code/`)

Photographier un QR imprimé : aperçu, « Garder », contenu lu ; un lien doit afficher l'avertissement
avant ouverture. Photographier une feuille sans code : message honnête.

### A.3 OCR (`/numerisation/ocr/`)

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

### A.4 Éditeur PDF (`/pdf/modifier/`)

Sur tablette ou téléphone : zoom par les boutons, défilement, « Modifier le texte » sur un passage
droit et sur un passage tourné (le champ suit le sens du texte), export, ouverture dans le lecteur
natif, recherche du nouveau mot.

### A.5 Safari et Firefox (desktop)

Parcourir : accueil, catalogue, un outil PDF (fusion), scanner (import), OCR (image), éditeur
(texte ajouté + export). Points connus à surveiller : encodeur WebP absent sur Safari (repli JPEG
prévu), variante SIMD du moteur OCR (repli prévu), `createImageBitmap` avec `imageOrientation`.

### A.6 Version anglaise

La liste détaillée des contrôles anglais est intégrée au §2 (lignes marquées « EN ») : interface,
sélecteur de langue, fusion, modificateur, OCR en anglais, hors ligne (`/en/offline/`), lecteur
d'écran.
