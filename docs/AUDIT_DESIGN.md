# OUTILIA — Audit du design de toutes les pages

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
phare » qui montre le modificateur PDF, puis populaires, familles, « Pourquoi OUTILIA », guides, FAQ.

| #   | Priorité | Constat                                                                                                                                                                                                                                                | Recommandation                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | P2       | Page très longue : **≈ 5 700 px sur bureau, ≈ 8 700 px sur mobile**. Sur mobile, les 8 cartes « Outils populaires » puis les 9 familles s'empilent en une colonne : 17 cartes à faire défiler avant « Pourquoi OUTILIA ».                              | Sur mobile, limiter les populaires à 4 avec « Voir les 8 » et présenter les familles en liste compacte (icône + nom + compteur sur une ligne) plutôt qu'en cartes. |
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
