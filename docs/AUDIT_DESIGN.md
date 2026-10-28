# AVEROPDF — Audit du design de toutes les pages

Audit **visuel uniquement** : mise en page, hiérarchie, cohérence, lisibilité, états, mobile et mode
sombre. Aucun code n'a été modifié pendant cet audit ; ce document liste des constats et des
recommandations, à arbitrer avant toute correction.

Date : 27 octobre 2026 — état du dépôt au commit `2670931`.

## 1. Méthode

- Build de production (`pnpm build` puis `pnpm start -p 3100`), captures Playwright avec le Chromium
  préinstallé (échelle 1×).
- **31 pages** capturées en pleine hauteur sur bureau (1440 × 900, thème clair) : accueil, catalogue,
  deux pages de famille (PDF, Images), 11 pages d'outils représentatives (une par famille et par type
  d'interface : fusionner, modifier, scanner, OCR, compresser une image, formater JSON, TVA, QR code,
  calendrier, compteur de mots, Word → PDF), guides (index + un guide), les sept pages éditoriales et
  légales, la page hors ligne, la page 404, et trois pages anglaises (accueil, catalogue, outil).
- **10 pages** sur mobile (390 × 844, iPhone 12/13/14 en largeur), plus le menu mobile ouvert.
- **6 pages** en mode sombre (bureau et accueil mobile), thème forcé via le réglage local du site.
- **12 états** : fichiers chargés, résultat prêt, erreur de format, PDF protégé, image chargée,
  modificateur ouvert (bureau, mobile, sombre), forme dessinée, recherche du catalogue avec et sans
  résultat, palette de recherche (Ctrl K).
- Les captures sont dans l'espace de travail de la session et n'ont pas été ajoutées au dépôt.

Ce que cet audit **ne couvre pas** : l'accessibilité au sens WCAG (déjà couverte par Lighthouse et
axe, score 100 sur toutes les pages testées), la performance, le contenu rédactionnel, et le
comportement des outils eux-mêmes. Quand un défaut visuel vient du contenu (texte manquant, valeur
absurde), il est signalé car il se voit à l'écran.

Priorités : **P1** = défaut visible qui nuit à la compréhension ou à la crédibilité ; **P2** =
incohérence ou friction notable ; **P3** = finition.

## 2. Vue d'ensemble : ce qui fonctionne

Le site a une identité claire et tenue d'une page à l'autre.

- **Palette** : indigo `#5146e5` comme seule couleur d'action, fond `#f8f9fc`, surfaces blanches,
  bordures `#e5e7f0`, vert réservé à la confidentialité et aux succès, ambre aux avertissements. Le
  mode sombre reprend les mêmes rôles (`#0d0f1b` / `#161929` / `#2a2f4a`) avec un lien éclairci
  `#a9a3ff`. Rien ne sort de cette grille.
- **Typographie** : titres en Bricolage Grotesque (gras, serré), texte en Instrument Sans. L'échelle
  est lisible : H1 ≈ 48 px sur bureau, corps 15–16 px, libellés secondaires 13–14 px.
- **Composants** : un seul modèle de carte (bordure, rayon 12–16 px, ombre légère au survol), un seul
  modèle de badge (pastille colorée par famille), un seul modèle de bouton principal, un seul
  « panneau résultat » vert. Ces composants sont réutilisés sur l'accueil, le catalogue, les familles,
  les outils, les guides et le pied de page.
- **Structure des pages d'outils** : fil d'Ariane, titre, promesse en une ligne, zone de dépôt ou
  formulaire, puis « Comment faire », « Limites », encart confidentialité, FAQ, outils liés. La
  hiérarchie est lisible d'un coup d'œil sur les 11 outils capturés.
- **Pied de page** : identique partout (quatre colonnes, pastille « Vos fichiers restent chez
  vous », mention des bibliothèques), y compris en anglais.
- **Mode sombre** : contrastes conservés sur toutes les pages capturées. Le modificateur PDF passe
  bien en sombre (vérifié sur les pixels de la capture : barre d'outils, rail, panneau des pages et
  fond du canevas en `#161929`).
- **Mobile** : en-tête réduit (logo, loupe, menu), tiroir de navigation propre, grilles qui passent
  à une colonne, chips de catégories en défilement horizontal, zones tactiles d'au moins 44 px sur
  les boutons principaux.
- **États** : erreur de format, PDF protégé (champ mot de passe dans un encart ambre), panneau
  « prêt » avec taille avant/après et bouton de téléchargement, palette de recherche : tous rendus
  proprement et dans le même langage visuel.

## 3. Constats transversaux

| #   | Priorité | Constat                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommandation                                                                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | P1       | Sur les **10 outils sans fichier d'entrée** (les 4 calculatrices, QR code, codes-barres, convertisseur de couleurs, calendrier, papier à imprimer, page de garde : `maxFileSizeBytes: 0` dans le registre), la section « Limites » affiche un encart absurde « Taille maximale **0 o** », et pour les 7 sans format déclaré un encart « Formats acceptés » vide. Vu sur `/calculatrices/tva/`, `/codes/generateur-qr-code/` et `/documents/calendrier-a-imprimer/`. | Ne pas afficher la grille formats/taille quand la limite est à zéro (condition dans `tool-page-layout.tsx`). Si une info est utile, remplacer par « Aucun fichier requis ».                                        |
| T2  | P2       | **Trois points d'entrée de recherche** visibles en même temps sur l'accueil (en-tête, héros, catalogue « Outils populaires ») et sur le catalogue (en-tête + barre de page). Ils ont trois styles différents (pilule compacte, barre 52 px avec bouton, barre 52 px sans bouton).                                                                                                                                                                                   | Garder deux styles au plus : la pilule d'en-tête et une barre de page unique. Sur l'accueil, la barre du héros suffit ; la barre du bloc « Outils populaires » peut devenir un simple lien « Voir les 69 outils ». |
| T3  | P2       | Le **texte d'invite de recherche** est tronqué sur bureau comme sur mobile : « Rechercher un outil (ex. fusionner, signer, comp » (héros), « Rechercher parmi 69 outils (ex. fusionner, signer, compresser)… » coupé sur mobile. Une phrase coupée au milieu d'un mot donne une impression de bug.                                                                                                                                                                  | Raccourcir l'invite à une forme qui tient en 320 px (« Rechercher un outil… ») et déplacer les exemples dans les chips de raccourcis déjà présentes sous la barre.                                                 |
| T4  | P2       | **Double notification d'erreur** : un fichier refusé affiche à la fois un texte rouge sous la zone de dépôt (sans icône) et un toast en bas au centre avec le même message. Le toast recouvre le contenu sur mobile.                                                                                                                                                                                                                                                | Garder l'erreur en ligne (avec icône et fond rouge pâle, comme l'encart ambre du mot de passe) et réserver le toast aux actions sans contexte visible (copie, téléchargement lancé).                               |
| T5  | P2       | La commande **« Utiliser hors ligne »** sous la zone de dépôt est suivie d'un texte d'aide gris de 12 px (« Télécharge … Mo pour cet outil ») qui passe sur deux lignes serrées sur mobile et se lit mal.                                                                                                                                                                                                                                                           | Mettre l'explication dans une infobulle ou un `details`, ne laisser visible que le bouton et le poids (« Hors ligne · 2,1 Mo »).                                                                                   |
| T6  | P3       | Les **grilles de 3 cartes** (outils liés, guides liés) laissent souvent une carte orpheline sur la dernière ligne (4 éléments en 3 colonnes).                                                                                                                                                                                                                                                                                                                       | Afficher 3 ou 6 éléments, ou passer à 2 colonnes quand le nombre n'est pas multiple de 3.                                                                                                                          |
| T7  | P3       | Les titres de famille dans le catalogue et l'accueil mélangent deux casses de compteur : « 27 outils » à droite du titre et « PDF 27 » dans le pied de page / les chips.                                                                                                                                                                                                                                                                                            | Harmoniser sur une forme (« 27 outils »).                                                                                                                                                                          |
| T8  | P3       | Les boutons de thème et de langue dans l'en-tête ont trois formes différentes (pilule FR/EN, icône ronde soleil, bouton rectangulaire « Tous les outils » avec icône).                                                                                                                                                                                                                                                                                              | Aligner les trois sur la même hauteur (40 px) et le même rayon ; garder une seule icône « pleine » (le soleil) pour éviter la concurrence visuelle avec le bouton d'action.                                        |

## 4. Page par page

### 4.1 Accueil `/` (bureau, mobile, sombre, anglais)

Points forts : héros court et lisible (« Vos fichiers, vos outils, votre navigateur. »), zone de
dépôt « Déposez un fichier ici » avec détection, trois promesses en pastilles, section « Produit
phare » qui montre le modificateur PDF, puis populaires, familles, « Pourquoi AVEROPDF », guides, FAQ.

| #   | Priorité | Constat                                                                                                                                                                                                                                                | Recommandation                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | P2       | Page très longue : **≈ 5 700 px sur bureau, ≈ 8 700 px sur mobile**. Sur mobile, les 8 cartes « Outils populaires » puis les 9 familles s'empilent en une colonne : 17 cartes à faire défiler avant « Pourquoi AVEROPDF ».                             | Sur mobile, limiter les populaires à 4 avec « Voir les 8 » et présenter les familles en liste compacte (icône + nom + compteur sur une ligne) plutôt qu'en cartes. |
| A2  | P2       | Les **chips de raccourcis** sous la barre du héros (« Modifier ou signer un PDF », « Scanner un document », « Reconnaître du texte (OCR) », « Compresser une image ») passent sur deux lignes avec une chip seule à la fin, même sur bureau à 1440 px. | Réduire à 3 raccourcis ou raccourcir les libellés pour tenir sur une ligne.                                                                                        |
| A3  | P3       | La **capture de l'éditeur** dans « Produit phare » montre toute l'interface réduite (≈ 630 px de large) : les libellés sont illisibles, elle illustre sans démontrer.                                                                                  | Capture recadrée sur une zone (barre d'outils + page) à la même largeur, ou deux captures (bureau + zoom).                                                         |
| A4  | P3       | Version anglaise : identique en qualité, mais la capture du modificateur sous « Flagship product » montre une interface **en français** (« Modifier le texte », « Télécharger le PDF modifié »).                                                       | Capturer une version anglaise de l'éditeur ou utiliser une illustration sans texte.                                                                                |

### 4.2 Catalogue `/outils/` et pages de famille `/pdf/`, `/images/` (bureau, mobile, sombre, anglais)

Points forts : barre latérale de catégories avec compteurs, chips horizontales sur mobile, sections
par famille avec sous-groupes (« Organiser les pages », « Modifier et signer »…), états « recherche »
et « aucun résultat » propres.

| #   | Priorité | Constat                                                                                                                                                                                                                   | Recommandation                                                                                                                         |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | P2       | Le catalogue complet répète le bloc **« Outils populaires »** (8 cartes) au-dessus des 69 outils déjà listés : les mêmes cartes apparaissent deux fois. La page fait ≈ 5 700 px sur bureau et **≈ 12 000 px sur mobile**. | Supprimer les populaires du catalogue (ils sont sur l'accueil) ou les réduire à une ligne de chips.                                    |
| C2  | P2       | Les pages de famille (`/pdf/`, `/images/`) sont la **même page** que le catalogue avec la chip présélectionnée ; le titre, l'intro et la barre de recherche (« parmi 69 outils ») ne reflètent pas la famille.            | Titre et intro propres à la famille, invite « Rechercher parmi 27 outils PDF », et masquer les autres familles au lieu de les grisser. |
| C3  | P3       | Les sous-titres de groupe (« ORGANISER LES PAGES ») sont en capitales 11 px gris : ils se perdent entre les cartes blanches.                                                                                              | Passer en 13 px semi-gras couleur `foreground` avec un filet, ou les intégrer comme bordure gauche colorée du groupe.                  |
| C4  | P3       | Sur les cartes, la description est coupée à deux lignes avec « … » au milieu d'un mot (« Combine plusieurs fichiers PDF en un seul doc… »).                                                                               | Descriptions courtes rédigées pour tenir en deux lignes, ou troncature à la fin d'une phrase.                                          |

### 4.3 Pages d'outils « fichier » (fusionner, compresser une image, Word → PDF, OCR)

Points forts : dropzone grande et explicite, badges « 100 % local », liste des fichiers avec poids et
ordre, bouton principal unique, panneau « prêt » vert avec gain de taille, FAQ en accordéon.

| #   | Priorité | Constat                                                                                                                                                                                                                                                                                        | Recommandation                                                                                                        |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| F1  | P2       | Sur `/images/compresser/`, le bouton « Compresser » (plein) et « Tout retirer » (contour) ont **la même taille** côte à côte ; sur `/pdf/fusionner/`, au contraire, « Fusionner 2 fichiers » est seul et large : deux outils, deux conventions.                                                | Aligner sur la convention de « Fusionner » : un bouton principal large, l'action secondaire en lien texte à gauche.   |
| F2  | P2       | Sur `/images/compresser/`, la carte de réglages (format, qualité, taille en pixels, encart d'avertissement) est placée **au-dessus** de la liste des fichiers et de la zone de dépôt : l'action d'entrée arrive à ≈ 500 px sous le titre, après des options que l'on ne peut pas encore juger. | Zone de dépôt en premier, réglages repliés par défaut (« Options ») ou affichés seulement une fois une image chargée. |
| F3  | P3       | Les colonnes « Comment faire » / « Limites » / « Confidentialité » utilisent trois traitements différents (liste numérotée, liste à puces, encart vert) ; les listes à puces du bloc « Limites » font jusqu'à 6 lignes denses.                                                                 | Garder l'encart vert, mais présenter les limites en 3 items maximum avec le reste repliable.                          |
| F4  | P3       | Après l'ajout de fichiers, un toast « 2 fichiers ajoutés » apparaît en bas de la fenêtre, **par-dessus le texte « À propos »**, pour une action dont le résultat est déjà visible (les lignes de fichiers).                                                                                    | Pas de toast pour l'ajout ; le compteur « 2 fichiers · 8 pages · 3,9 Ko » déjà présent suffit.                        |

### 4.4 Pages d'outils « formulaire » (TVA, QR code, calendrier, compteur de mots, JSON)

Points forts : formulaires courts, résultats affichés sans rechargement, bouton de copie visible.

| #   | Priorité | Constat                                                                                                                                                                                                                                                          | Recommandation                                                                                                         |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| G1  | P1       | **« Formats acceptés » vide et « Taille maximale 0 o »** (voir T1) sur TVA, QR code et calendrier.                                                                                                                                                               | Voir T1.                                                                                                               |
| G2  | P2       | Le **sélecteur TVA** (HT → TTC / TTC → HT / Taux) est un contrôle segmenté sur bureau mais devient **trois cartes empilées pleine largeur** sur mobile, ce qui ressemble à trois boutons d'action.                                                               | Garder un contrôle segmenté sur mobile (3 segments tiennent en 358 px) ou utiliser un menu déroulant.                  |
| G3  | P3       | Sur « Formater JSON », la zone de texte source et la zone résultat ont la même hauteur fixe (≈ 220 px) ; un JSON de 30 lignes oblige à défiler dans deux petites boîtes.                                                                                         | Hauteur automatique jusqu'à 60 vh, ou deux colonnes sur bureau.                                                        |
| G4  | P3       | Sur le générateur de QR code, le bouton « Télécharger en PNG » désactivé est rendu en indigo pâle à 60 % : il ressemble à un bouton secondaire cliquable plutôt qu'à un bouton inactif, et il est suivi de deux autres boutons gris empilés sous un aperçu vide. | État désactivé en gris (`muted` + texte `muted-foreground`), et masquer les actions tant qu'aucun contenu n'est saisi. |

### 4.5 Modificateur PDF `/pdf/modifier/` (bureau, mobile, sombre, forme dessinée)

Points forts : plein écran dès l'ouverture, en-tête compact (nom, pastille « 3 pages · texte
natif », annuler/rétablir, bouton de téléchargement), barre d'intention sous l'en-tête, panneau des
pages à gauche, pied avec pagination et zoom, mode sombre complet.

| #   | Priorité | Constat                                                                                                                                                                                                                                                                       | Recommandation                                                                                                                                                                  |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | P2       | Le **rail d'outils** fait 76 px de large ; les libellés sur deux lignes (« Modifier le texte », « Ajouter du texte », « Ajouter du texte ») et le rail est **coupé en bas** à 900 px de haut : « Image » est à moitié visible et « Signature » demande un défilement du rail. | Rail de 88–96 px avec libellés sur une ligne, ou icônes seules avec infobulles ; faire défiler le rail de façon visible (ombre basse) ou regrouper « Insérer » dans un menu.    |
| E2  | P2       | L'en-tête du panneau des pages (« 3 pages » / « Insérer un PDF » / ✕) **se replie sur deux lignes** dans ses 172 px.                                                                                                                                                          | Libellé « Insérer » avec icône seule, titre « Pages (3) ».                                                                                                                      |
| E3  | P2       | Les **vignettes** de page font 80 × 104 px dans des cellules de 170 px de haut ; les cinq icônes d'action (tourner, dupliquer, monter, descendre, supprimer) s'affichent sous la vignette sélectionnée et occupent plus de place que la page.                                 | Vignette à 120 px de large, actions dans un menu « ⋯ » au survol ou au clic droit ; garder seulement « supprimer » visible.                                                     |
| E4  | P2       | Le **canevas** (page à 84 %) est centré dans un grand aplat gris : à 1440 px, environ 45 % de la largeur est vide de chaque côté. Le zoom par défaut « ajuster à la largeur » serait plus utile pour lire et éditer.                                                          | Zoom initial « ajuster à la largeur » (moins les marges), « ajuster à la page » en second choix.                                                                                |
| E5  | P2       | Sur **mobile**, l'en-tête tronque le nom du fichier et la pastille (« simple-3-pag… », « 3 pages · tex… ») ; la barre d'outils en bas montre 5 outils avec défilement non signalé.                                                                                            | Sur mobile, masquer la pastille dans l'en-tête (la mettre dans le menu ⋯), afficher le nom sur une ligne à 13 px, et indiquer le défilement de la barre par un dégradé de bord. |
| E6  | P3       | Le bouton « Télécharger le PDF modifié » (indigo plein) et le bouton d'outil actif (indigo pâle) partagent la même couleur : au premier regard, deux « actions principales ».                                                                                                 | Outil actif sur fond `muted` avec bordure indigo plutôt que fond indigo pâle.                                                                                                   |
| E7  | P3       | En mode sombre, le rail, le panneau des pages, le fond du canevas et le pied ont **la même couleur** (`#161929`) ; seuls des filets de 1 px les séparent.                                                                                                                     | Fond du canevas un cran plus sombre (`background`) que les panneaux (`surface`).                                                                                                |
| E8  | P3       | La ligne d'aide contextuelle sous la barre d'intention (« Cliquez sur un passage du document pour remplacer son texte… ») est alignée à droite, en gris 13 px, loin de l'outil qu'elle décrit.                                                                                | Afficher l'aide sous l'outil sélectionné dans le rail, ou en infobulle au survol.                                                                                               |

### 4.6 Scanner `/numerisation/scanner-un-document/` et OCR `/numerisation/ocr/`

| #   | Priorité | Constat                                                                                                                                                                                                                                     | Recommandation                                                                                                      |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| S1  | P2       | Deux boutons de **même poids** côte à côte (« Importer des photos » plein, « Prendre une photo avec la caméra » plein) : deux actions principales concurrentes.                                                                             | Sur mobile, caméra en principal et import en secondaire ; sur bureau l'inverse (pas de caméra la plupart du temps). |
| S2  | P3       | Le titre de l'OCR (« OCR : reconnaître le texte d'un PDF ou d'une image ») passe sur deux lignes à 1440 px : c'est le seul H1 d'outil capturé sur deux lignes, et la colonne « Outils associés » démarre plus bas que sur les autres pages. | H1 court (« Reconnaître du texte (OCR) ») et titre long réservé à la balise `<title>` / au sous-titre.              |

### 4.7 Guides `/guides/` et `/guides/comment-fusionner-des-pdf/`

Points forts : page guide très lisible (sommaire implicite par H2, encart « Outil » lié, étapes
numérotées, FAQ), même qualité en anglais.

| #   | Priorité | Constat                                                                                                                                                | Recommandation                                                                                                  |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| H1  | P2       | L'**index des guides** est une grille de cartes **texte seul** (titre, résumé, « Outil : X ») sans icône ni visuel : toutes les cartes se ressemblent. | Icône de la famille de l'outil lié (déjà disponible dans le registre) en tête de carte, et pastille de famille. |
| H2  | P3       | Le lien « Outil : Fusionner des PDF » en bas de carte est en texte gris et passe pour une métadonnée, pas pour un lien.                                | Style de lien (`link`, souligné) ou bouton secondaire.                                                          |
| H3  | P3       | Dans un guide, la grille des outils liés affiche 4 cartes en 3 colonnes (orpheline, voir T6).                                                          | Voir T6.                                                                                                        |

### 4.8 Pages éditoriales et légales (À propos, Contact, Confidentialité, Mentions légales, Conditions, Cookies, Affiliation, Vérifiez-le)

Points forts : colonne de lecture centrée (≈ 770 px), titres clairs, liens soulignés, encart
« Vos préférences » de la page cookies avec bouton d'action, placeholders légaux en surlignage jaune
bien visibles (volontaire, pour ne pas inventer d'identité légale).

| #   | Priorité | Constat                                                                                                                                                    | Recommandation                                                                                      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| L1  | P3       | Sur Contact et À propos, la colonne commence à 336 px du bord gauche alors que le fil d'Ariane est à 120 px : deux alignements verticaux sur la même page. | Aligner le fil d'Ariane sur la colonne de lecture (ou l'inverse).                                   |
| L2  | P3       | La page Contact ne contient qu'un placeholder d'adresse et deux paragraphes : elle paraît inachevée même une fois l'adresse renseignée.                    | Ajouter un encart « Avant d'écrire » (FAQ, page Vérifiez-le) pour donner du corps, sans formulaire. |
| L3  | P3       | Les listes à puces de la page cookies mélangent un paragraphe gras dans la liste (« Aucun service tiers… »), ce qui casse le rythme.                       | Sortir le paragraphe de la liste, en encart `muted`.                                                |

### 4.9 Hors ligne `/hors-ligne/` et 404

La 404 est courte et centrée (code en indigo, titre, phrase, un bouton principal « Retour à l'accueil » et
un secondaire « Parcourir les outils ») : rien à signaler. La page hors ligne présente la liste des outils
enregistrés en lignes (lien + « Retirer »), puis deux sections explicatives : lisible et cohérente.

| #   | Priorité | Constat                                                                                                                            | Recommandation                                                          |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| O1  | P3       | Sur la page hors ligne, les 11 lignes d'outils n'ont ni icône ni famille : la liste est moins reconnaissable que le reste du site. | Icône de famille devant chaque lien, comme sur les cartes du catalogue. |

### 4.10 Version anglaise `/en/…`

Même design, mêmes composants, pied de page et en-tête traduits. Deux points : la capture de
l'éditeur reste en français (A4) et, sur le catalogue anglais `/en/tools/` comme sur `/en/pdf/`, les
titres de famille, les sous-titres de groupe et la barre latérale sont restés en français (« Outils
PDF », « Organiser les pages », « Numérisation et OCR », « Outils images », « Conversion de
fichiers », « Numérisation », « Développeur », « Calculs », « QR & couleurs »…), alors que le titre,
l'intro, les cartes, l'en-tête et le pied de page sont en anglais. Vérifié dans le HTML servi, pas
seulement sur la capture.

| #   | Priorité | Constat                                                                                                                                                                | Recommandation                                                                                                                                      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | P1       | **Titres de famille, sous-groupes et barre latérale en français** sur le catalogue anglais et les pages de famille anglaises (cartes, titre et intro bien en anglais). | Localiser les libellés de famille et de sous-groupe du catalogue (ils ne passent pas par le registre anglais des outils, contrairement aux cartes). |
| N2  | P3       | Capture de l'éditeur en français sur `/en/` (voir A4).                                                                                                                 | Voir A4.                                                                                                                                            |

### 4.11 Mobile (synthèse)

- En-tête, tiroir, chips, cartes, formulaires : cohérents et utilisables.
- Longueur : accueil ≈ 8 700 px, catalogue ≈ 12 000 px (A1, C1).
- Troncatures : invite de recherche (T3), nom de fichier et pastille de l'éditeur (E5).
- Contrôles qui changent de nature entre bureau et mobile : segmenté TVA → cartes (G2), deux boutons
  pleins du scanner empilés (S1).
- Toast en bas au centre qui recouvre le bouton principal après une erreur (T4).

### 4.12 Mode sombre (synthèse)

- Toutes les pages capturées passent correctement, y compris le modificateur ouvert.
- Un seul constat de finition : les panneaux et le fond du canevas de l'éditeur ont la même couleur
  (E7).
- Les pastilles de famille (fond coloré pâle) restent lisibles ; les surlignages jaunes des
  placeholders légaux restent lisibles sur fond sombre.

## 5. Ce que je recommande de corriger en premier

1. **T1 / G1** — supprimer « Formats acceptés » vide et « Taille maximale 0 o » sur les 10 outils
   sans fichier : correction d'une condition, très visible, nuit à la crédibilité.
2. **N1** — traduire les titres de famille, sous-groupes et barre latérale du catalogue anglais.
3. **C1 + C2** — alléger le catalogue (plus de doublon « populaires », pages de famille réellement
   dédiées) : c'est la page la plus longue du site et la deuxième en trafic attendu.
4. **T3 + A2** — invites et chips du héros qui tiennent sur une ligne.
5. **E1 à E4** — rail, panneau des pages et zoom initial du modificateur, l'outil mis en avant sur
   l'accueil.
6. **T4** — une seule notification d'erreur, en ligne.

Le reste (P3) relève de la finition et peut suivre dans un lot « polish » sans urgence.

## 6. Ce que cet audit n'a pas fait

- Aucune modification de code, de contenu ou de configuration.
- Pas de test sur appareil réel ni sur Safari/Firefox : captures Chromium uniquement (les
  différences de rendu de polices et de formulaires natifs sur iOS ne sont donc pas couvertes ; voir
  `docs/VALIDATION_APPAREIL_REEL.md`).
- Les 58 pages d'outils non capturées partagent le même gabarit que les 11 capturées ; les constats
  de gabarit (T1 à T8, F1 à F4) s'y appliquent, mais un défaut propre à un outil précis a pu
  échapper à l'audit.

## 7. Corrections apportées (mission de finition UX/UI, après l'audit)

Les constats ci-dessus décrivent l'état au commit `2670931`. Cette section liste ce qui a été corrigé
ensuite, sans changer l'identité visuelle (palette, typographies, composants), sans supprimer d'outil
ni modifier d'URL. Rien n'a été déployé et la configuration publicitaire n'a pas été touchée.

### 7.1 Défauts P1 corrigés

| #       | Cause réelle                                                                                                                                                                                                                                              | Correction                                                                                                                                                                                                                                                                                                                           | Fichiers                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| N1      | Le catalogue (composant client) lisait `toolCategories`, la source française brute, au lieu de `getCategories()` qui applique la locale. Les noms de sous-groupes n'avaient aucune version anglaise.                                                      | Le catalogue passe par `getCategories()` (locale ambiante). Les noms anglais des 11 sous-groupes sont centralisés à côté de leur définition (`toolGroupNamesEn`), le groupe de repli « Autres » devient « Other ». Aucune condition locale dispersée dans les composants.                                                            | `src/components/tools/tool-catalog.tsx`, `src/lib/tools/groups.ts`                                |
| T1 / G1 | La page d'outil affichait toujours `formatBytes(limits.maxFileSizeBytes)` et la liste brute `inputFormats`, y compris pour les 10 outils déclarés sans fichier (`maxFileSizeBytes: 0`). Les types MIME inconnus (`image/gif`, DOCX…) s'affichaient bruts. | Un helper unique `getToolInputLimits()` décide : outil avec fichier → formats lisibles et taille réelle ; outil sans fichier → encart « Aucun fichier à importer : tout se fait dans la page » (traduit). Aucune valeur inventée : une limite absente reste absente. Libellés de formats FR/EN (GIF, SVG, Word (.docx), Texte/Text). | `src/lib/tools/input-limits.ts`, `src/components/tools/tool-page-layout.tsx`, `src/lib/i18n/*.ts` |

Tests ajoutés : `tests/unit/catalog-design.test.ts` (libellés des 9 familles et 11 sous-groupes en
anglais, noms français inchangés, limites des 10 outils sans fichier, limites réelles des outils avec
fichier, libellés de formats sans `/` dans les deux langues) et `e2e/catalog-labels.spec.ts` (HTML
serveur et page hydratée de `/en/tools/` et des 9 familles anglaises, catalogue français inchangé,
encart des limites sur 4 pages et sur fusion/Word → PDF).

### 7.2 Problèmes P2 corrigés

| #   | Correction                                                                                                                                                                                                                                                                                                                              | Pages                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| T2  | Une seule barre de recherche de page, partagée (`SearchField`), sur l'accueil, le catalogue et les familles ; l'en-tête garde sa pilule de recherche rapide (Ctrl K). Sur l'accueil : dépôt de fichier (action principale), puis recherche plus discrète (48 px, ombre légère), puis raccourcis.                                        | Accueil, catalogue, 9 familles (FR et EN)                  |
| T3  | Invite courte (« Rechercher parmi 69 outils… », « Rechercher parmi ces 27 outils… » sur une famille) et bouton « Rechercher » réduit à une icône sur mobile : l'invite n'est plus coupée.                                                                                                                                               | Idem                                                       |
| A2  | Raccourcis du héros sur une seule ligne à 1440 px (libellés français raccourcis), bande défilante sur mobile comme les catégories du catalogue.                                                                                                                                                                                         | Accueil                                                    |
| A1  | Familles compactes sur mobile (sans exemples), cartes populaires en ligne sur mobile.                                                                                                                                                                                                                                                   | Accueil                                                    |
| C1  | Le bloc « Outils populaires » n'est plus répété dans le catalogue (il reste sur l'accueil) ; cartes du catalogue sur une ligne de description sur mobile, deux à partir de 640 px. Les 69 outils restent tous listés et rendus côté serveur.                                                                                            | Catalogue                                                  |
| C2  | Les pages de famille gardent leur H1 et leur introduction propres ; le titre de section qui répétait le nom de la famille est réservé aux lecteurs d'écran ; la recherche annonce « parmi ces N outils » et cherche dans la famille ; la barre latérale reste pour changer de famille.                                                  | 9 familles                                                 |
| T4  | Une seule notification par problème de fichier : encart d'erreur en ligne (icône, fond rouge pâle, `role="alert"`) sous la zone de dépôt. Les toasts doublons ont été retirés des deux zones de dépôt ; les erreurs de lecture, doublons et « au moins deux fichiers » de la fusion vont dans le même encart.                           | Tous les outils à zone de dépôt                            |
| F4  | Plus de toast « n fichiers ajoutés » (les lignes de fichiers et le résumé suffisent). Les toasts restants (copie, téléchargement, OCR terminé…) s'affichent en bas à droite sur grand écran, hors de la colonne de contenu.                                                                                                             | Fusion, toutes pages                                       |
| T5  | « Utiliser hors ligne · 4,7 Mo » : le poids est dans le bouton, la phrase d'explication devient sa description accessible et son infobulle.                                                                                                                                                                                             | Tous les outils                                            |
| E1  | Rail de 88 px, libellés sur une ligne (« Modifier », « Texte » ; nom complet conservé pour l'accessibilité et l'infobulle). Rail adaptatif : sous 940 px de haut, titres de groupes masqués et boutons de 38 px ; sous 820 px, icônes seules sur deux colonnes. Tous les outils restent visibles à 1440 × 900 et 1366 × 768 (captures). | Modificateur                                               |
| E2  | En-tête du panneau des pages sur une ligne (« 3 pages », « Insérer », fermer).                                                                                                                                                                                                                                                          | Modificateur                                               |
| E3  | Vignettes de 120 × 156 px (au lieu de 80 × 104), actions de page sur une seule ligne sous la vignette.                                                                                                                                                                                                                                  | Modificateur                                               |
| E4  | Zoom initial « largeur » : la page remplit la largeur disponible jusqu'à 920 px, en gardant au moins une demi-page visible sur les écrans peu hauts (116 % à 1440 × 900 au lieu de 84 %). Seule l'échelle d'affichage change : coordonnées du document et des annotations inchangées (en points PDF).                                   | Modificateur                                               |
| E5  | Mobile : nom de fichier lisible (extension toujours visible, 13 px), bouton de téléchargement en icône (nom accessible complet), ligne d'état déplacée dans le menu « ⋯ » (conservée pour les lecteurs d'écran), dégradé signalant que la barre d'outils défile.                                                                        | Modificateur mobile                                        |
| S1  | Une seule action principale : caméra en principal sur les appareils tactiles (placée en premier), import en principal ailleurs ; l'autre bouton passe en contour.                                                                                                                                                                       | Scanner                                                    |
| G2  | Le contrôle segmenté reste une rangée de trois segments sur mobile (« HT / TTC / TVA », libellé complet pour l'accessibilité) ; option `shortLabel` du composant partagé, sans effet sur les autres usages.                                                                                                                             | TVA                                                        |
| F1  | Hiérarchie des boutons : « Tout retirer » en bouton discret, action principale seule en plein ; boutons « Ajouter des fichiers/images » des zones compactes en contour.                                                                                                                                                                 | Compression et outils images par lot, images → PDF, fusion |
| F2  | Les réglages viennent après les fichiers, juste au-dessus de l'action (ils n'étaient affichés qu'une fois une image chargée, mais au-dessus d'elle).                                                                                                                                                                                    | Compression et outils images par lot                       |

### 7.3 Finitions P3 réalisées

- **T6 / H3** : guide → outils liés en nombre pair sur deux colonnes ; index des guides sur trois
  colonnes quand le nombre de guides le permet (9 en français : 3 × 3), deux sinon.
- **H1 / H2** : cartes de l'index des guides avec l'icône teintée de la famille de l'outil lié et un
  lien explicite « Ouvrir l'outil : … → ».
- **A3 / A4 / N2** : nouvelles captures réelles du modificateur avec l'interface actuelle, cadrées
  plus serré (1180 × 760 au lieu de 1366 × 860), une en français et une en anglais ; l'accueil anglais
  affiche la capture anglaise.
- **L1** : fil d'Ariane aligné sur la colonne de lecture des pages légales et éditoriales.
- **L3** : espacement entre une liste et le paragraphe qui la suit (page cookies et toutes les pages
  textuelles).
- **G4** : bouton principal désactivé en gris neutre (et non plus en indigo pâle) dans tout le site ;
  pendant un traitement (`aria-busy`), il garde sa couleur avec l'indicateur de chargement.
- **C3** : titres de sous-groupes du catalogue en 13 px semi-gras, suivis d'un filet.
- **E6** : outil actif du rail en contour indigo ; le plein indigo reste réservé au téléchargement.
- **E7** : en mode sombre, fond du canevas plus sombre que les panneaux.
- **O1** : icône de famille devant chaque outil enregistré sur la page hors ligne.

### 7.4 Mesures (mêmes méthodes que l'audit : captures Playwright 1440 × 900 et 390 × 844)

| Page              | Avant (audit) | Après    |
| ----------------- | ------------- | -------- |
| Accueil, mobile   | 8 682 px      | 7 247 px |
| Catalogue, mobile | 12 095 px     | 9 103 px |
| Catalogue, bureau | 5 836 px      | 5 406 px |
| Accueil, bureau   | 4 441 px      | 4 397 px |

Le tableau 4.1 de l'audit indiquait ≈ 5 700 px pour l'accueil sur bureau : la capture d'origine
mesure en réalité 4 441 px (estimation erronée de l'audit, corrigée ici).

### 7.5 Défauts encore ouverts (non bloquants)

| #   | Priorité | Pourquoi il reste ouvert                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C4  | P3       | Descriptions coupées par « … » sur les cartes du catalogue. Mesuré le 2026-10-28 : 69/69 coupées (FR, bureau et mobile), textes de 70 à 131 caractères. Essai de 3 lignes sur bureau et 2 sur mobile : encore 39/69 et 65/69 coupées, pour +1 600 px sur le catalogue mobile ; non retenu. La correction est éditoriale : des descriptions courtes de carte (≈ 65 caractères) dans le registre FR et EN. |
| F3  | P3       | Listes « Limites » longues : les replier masquerait des informations utiles (formats, limites réelles). À décider avec le contenu.                                                                                                                                                                                                                                                                       |
| G3  | P3       | Zones de texte JSON de hauteur fixe : à revoir avec l'outil (redimensionnement manuel déjà possible).                                                                                                                                                                                                                                                                                                    |
| G4  | P3       | Partiellement traité : le bouton désactivé est désormais gris neutre ; les actions du QR code restent affichées (désactivées) avant saisie, ce qui annonce ce que l'outil produira.                                                                                                                                                                                                                      |
| S2  | P3       | Titre H1 de l'OCR sur deux lignes : le H1 est le nom de l'outil, partagé avec le titre SEO, le fil d'Ariane et les cartes ; le raccourcir est une décision éditoriale et SEO.                                                                                                                                                                                                                            |
| E8  | P3       | Ligne d'aide de l'outil actif alignée à droite sous la barre d'intention : à déplacer avec une refonte de la barre contextuelle.                                                                                                                                                                                                                                                                         |
| T7  | P3       | Compteurs « PDF 27 » (pied de page, chips) et « 27 outils » (titres) : deux contextes de densité différents, laissés en l'état.                                                                                                                                                                                                                                                                          |
| T8  | P3       | Contrôles de l'en-tête (recherche, tous les outils, langue, thème) de formes différentes : cohérents en hauteur, à unifier si l'en-tête est revu.                                                                                                                                                                                                                                                        |
| CLS | —        | **Corrigé le 2026-10-28** : QR code, testeur de regex et générateur d'UUID sont rendus côté serveur (CLS mobile 0,326 / 0,201 / 0,079 → 0,001 / 0,002 / 0,003, outil visible à ≈ 1,2 s au lieu de ≈ 4 s ; mesures et méthode dans `docs/RAPPORT_FINALISATION_AVEROPDF.md` §3).                                                                                                                           |
| L2  | P3       | Page Contact courte : elle dépend de l'adresse de contact que l'éditeur doit renseigner (`docs/PLAN_LANCEMENT.md` §0) ; aucun contenu n'a été inventé.                                                                                                                                                                                                                                                   |
| —   | P3       | Capture anglaise de l'éditeur : l'interface est en anglais, le document de test affiché reste un document français (contenu du fichier, pas de l'interface).                                                                                                                                                                                                                                             |

### 7.6 Reporté après le lancement

- Lot « polish » des P3 ci-dessus, après les premiers retours réels.
- Vérification sur appareils réels (Safari iOS, Firefox, Android) des écrans modifiés :
  `docs/PLAN_LANCEMENT.md` §1, point 4. **Non vérifié dans cet environnement** (Chromium seul).

### 7.7 Stabilité de mise en page des pages d'outils (constat ajouté pendant la vérification)

Les outils sont des composants chargés côté client ; pendant leur chargement, un squelette de 256 px
occupe leur place. Mesuré au Lighthouse mobile, ce squelette provoquait un décalage visible sur les
outils « formulaire », dont la zone réelle mesure 500 à 1 300 px : CLS de 0,21 à 0,31 au commit
`004c0d4`, **avant cette mission** (vérifié en reconstruisant ce commit dans une copie de travail
séparée). Ce n'est pas un défaut introduit par les lots ci-dessus, mais il nuit à la fiabilité perçue :
il a été corrigé.

- Chaque emplacement d'outil réserve, pendant le chargement seulement, la hauteur mesurée de l'outil
  chargé (390 px et 1440 px) : `src/lib/tools/workspace-heights.ts`, généré par
  `scripts/measure-workspace-heights.mjs` à relancer après un changement de mise en page d'outil.
- Réservé pour 26 outils des familles texte, développeur, calculatrices, codes et documents.
  Volontairement **pas** pour les familles à zone de dépôt (PDF, numérisation, images, conversion) :
  sur les pages de ces familles mesurées, le CLS final va de 0 à 0,09, et la réserve y repoussait le
  grand texte de la page sous la ligne de flottaison, ce qui retardait le LCP mesuré de 3,3 s à 6,3 s
  (modificateur, signature, OCR).
  Trois outils formulaire sont exclus pour la même raison (§7.5).

| Page (Lighthouse mobile)                   | Avant (`004c0d4`)     | Après                                                                                   |
| ------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------- |
| `/calculatrices/tva/`                      | CLS 0,222 · perf 78   | CLS 0 · perf 87–90                                                                      |
| `/texte/compteur-de-mots/`                 | CLS 0,24 · perf 77    | CLS 0 · perf 90–94                                                                      |
| `/codes/convertisseur-couleurs/`           | CLS 0,251 · perf 77   | CLS 0 · perf 89–94                                                                      |
| `/conversion/word-vers-pdf/` (non réservé) | CLS 0,211 · perf 70   | CLS 0 · perf 77 (constaté ; cause non isolée, la famille conversion n'a pas de réserve) |
| `/pdf/modifier/`                           | CLS 0,005 · LCP 3,3 s | CLS 0,005 · LCP 3,3 s                                                                   |

Les scores de performance mobiles varient de quelques points d'une mesure à l'autre (serveur local,
CPU ralenti ×4) ; les valeurs de CLS sont stables.

### 7.8 Tests exécutés et captures vérifiées

Toutes les commandes ont été exécutées sur le build de production final de la mission.

| Contrôle                                                             | Résultat                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`, ESLint, Prettier (`--check .`)                       | 0 erreur, 0 avertissement                                                                                                                                                                                                  |
| Vitest                                                               | 266 tests, 32 fichiers, 0 échec (8 nouveaux)                                                                                                                                                                               |
| `next build`                                                         | réussi                                                                                                                                                                                                                     |
| Playwright complet, Chromium bureau + Pixel 7                        | 302 exécutions : 289 passées, 13 ignorées par conception, 0 échec (32 nouvelles), lancé deux fois                                                                                                                          |
| Lighthouse mobile (CPU ×4), même méthode que `AUDIT_PERFORMANCES.md` | accessibilité, bonnes pratiques et SEO à 100 sur les 15 pages mesurées en entier ; CLS de 0 à 0,09 partout, sauf les 3 outils du §7.5 (QR code : 0,306, inchangé) ; performance seule mesurée sur les 29 outils formulaire |

**Régressions rencontrées et résolues pendant la mission**

- Le nouveau zoom initial agrandit la page : deux tests Playwright cliquaient dans la moitié basse de
  la page, hors d'une fenêtre de 720 px de haut. Les points de clic ont été remontés (le comportement
  testé est inchangé) et le zoom garde au moins une demi-page visible sur les écrans peu hauts.
- Le rail du modificateur débordait encore de quelques pixels à 900 px et 768 px de haut après le
  premier passage : variantes de hauteur ajustées et icônes sur deux colonnes sous 820 px.
- La réserve de hauteur des outils retardait le LCP de pages à zone de dépôt et de trois outils
  formulaire : limitée aux outils où elle est un gain mesuré (§7.7).

**Captures vérifiées** (Playwright, mêmes formats que l'audit ; conservées hors dépôt) : accueil FR
et EN (bureau, mobile, mobile sombre), catalogue FR et EN, page de famille PDF et Images, TVA (bureau,
mobile, sombre), QR code, scanner (bureau, mobile tactile), compression d'image avec fichier chargé,
fusion avec fichiers et en erreur (bureau, mobile), Word → PDF, modificateur ouvert à 1440 × 900,
1366 × 768, 390 × 844 et en sombre, modificateur anglais, index des guides, guide, contact, cookies.

**Non vérifié** : Safari (macOS, iOS), Firefox et appareils réels ne sont pas disponibles dans cet
environnement ; voir §7.6. Aucun déploiement n'a eu lieu et la configuration publicitaire n'a pas été
modifiée.
