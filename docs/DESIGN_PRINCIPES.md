# OUTILIA — Principes de design retenus (refonte « simplification »)

Document écrit **avant** les modifications d'interface, comme demandé. Il fixe ce qui est retenu,
pourquoi, et comment chaque page existante est touchée. Les 66 outils, leurs routes et leur contenu
SEO sont conservés.

## 1. Étude des références : ce qui a pu être fait, et ce qui n'a pas pu l'être

| Site                               | Accès direct depuis l'environnement de travail                       | Ce qui a été utilisé                            |
| ---------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| https://www.smallpdf.com/          | **Impossible** (le proxy réseau refuse la connexion : `CONNECT 403`) | Sources secondaires seulement (voir ci-dessous) |
| https://www.ilovepdf.com/          | **Impossible** (`CONNECT 403`)                                       | Sources secondaires seulement                   |
| https://tools.pdf24.org/           | **Impossible** (`CONNECT 403`)                                       | Sources secondaires seulement                   |
| https://outils-simples.vercel.app/ | **Impossible** (`CONNECT 403`, aucune trace dans la recherche web)   | Rien : aucune information fiable disponible     |

Conséquence honnête : **aucune analyse de l'interface actuelle de ces quatre sites n'a pu être
faite**. Je n'invente pas de description de leurs pages. Les seules informations externes obtenues
(recherche web, sources datées et indirectes) sont :

- iLovePDF, billet « Welcome to the new iLovePDF » (2019) : l'équipe explique avoir retiré les
  éléments encombrants de l'en-tête et du pied de page pendant le traitement d'un fichier, au profit
  d'un menu latéral, pour laisser la place au document. Idée retenue : **pendant le traitement, la
  page se vide de tout ce qui n'est pas l'action en cours**.
- Smallpdf, guide « How to use Smallpdf » (site de l'éditeur, non daté) : « allez sur la page
  d'accueil, choisissez un outil, déposez un fichier dans la boîte colorée ». Idée retenue : **le
  parcours en trois temps (choisir, déposer, télécharger) doit être lisible sans explication**.
- PDF24 : avis d'utilisateurs (Capterra/GetApp) louant la simplicité et une organisation des outils
  par familles. Idée retenue : **des familles d'outils peu nombreuses et nommées simplement**.

Ces trois idées ne décrivent pas l'état actuel de ces sites et ne sont pas copiées ; elles servent
de garde-fous. Pour vérifier les interfaces réelles, il faut autoriser ces quatre domaines dans la
configuration réseau de l'environnement (voir le message de fin de travail) ou faire la revue
manuellement : une grille de lecture est fournie en annexe.

## 2. Constats mesurés sur OUTILIA (captures d'écran de l'état actuel, Chromium)

| Constat                                                   | Mesure                                                                                                                                                       | Effet pour l'utilisateur                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| En-tête desktop surchargé                                 | 9 liens + champ de recherche + bouton éditeur + langue + thème dans 1 366 px : le champ de recherche se réduit à un cercle de 40 px, « Documents » est coupé | La recherche, pourtant centrale, disparaît                                                                     |
| Accueil = catalogue complet                               | Titre « Tous les outils », sous-titre, pastille confidentialité, recherche, colonne de catégories, 9 sections de cartes (66 cartes)                          | Trop d'information avant la première action ; sur mobile la première carte arrive après 1 100 px de défilement |
| Cartes « populaires » et cartes « compactes » différentes | Deux tailles d'icône, deux rayons, deux mises en page                                                                                                        | Rythme visuel incohérent                                                                                       |
| Page d'outil : action sous le pli sur mobile              | Fil d'Ariane + 2 badges + H1 48 px + description de 6 lignes avant la zone de dépôt                                                                          | Sur un Pixel 7, la zone de dépôt du scanner n'est pas visible à l'arrivée                                      |
| Éditeur PDF : page trop petite                            | Zone utile 1 140 × 711 px, page rendue 457 × 647 px (ajustement à la hauteur, plafonné)                                                                      | Texte illisible sans zoomer                                                                                    |
| Éditeur PDF : flou sur écran haute densité                | DPR 2,625 : canvas 913 px pour 348 px CSS, soit un ratio 2,6236 ≠ 2,625 (arrondi au pixel inférieur)                                                         | Rééchantillonnage non entier : texte flou                                                                      |
| Scanner : page « dégradée noir et blanc »                 | `defaultScanSettings.filter = "document"` : le filtre produit une image **grise** (division par le fond local) appliquée à **toute** photo dès l'ajout       | La photo d'origine n'est jamais montrée telle quelle                                                           |
| Scanner : « le déclencheur ne fait rien »                 | Après la prise, la page est ajoutée **derrière** le dialogue caméra qui reste ouvert, sans aperçu ni message                                                 | L'utilisateur ne voit aucun effet                                                                              |

## 3. Principes retenus

1. **Une page, une action principale.** Chaque page commence par ce que l'utilisateur est venu
   faire : sur l'accueil, chercher ou choisir un outil ; sur une page d'outil, déposer un fichier.
   Le contenu SEO (mode d'emploi, limites, FAQ) reste, mais **après** l'action.
2. **La recherche est évidente partout.** Champ large et unique sur l'accueil, bouton clair dans
   l'en-tête sur toutes les autres pages, raccourci clavier conservé. Pas de deuxième champ qui
   rivalise.
3. **Le catalogue est à un clic, pas sur l'accueil.** L'accueil montre une sélection (outils
   populaires) et les familles d'outils ; la page `/outils/` devient le vrai catalogue complet,
   filtrable par catégorie et par recherche. Les pages de catégorie restent des catalogues filtrés.
4. **Un seul modèle de carte.** Icône dans une pastille, nom, description courte sur deux lignes
   maximum, même rayon, même marge, même comportement au survol. La mise en avant se fait par la
   position, pas par une carte différente.
5. **Navigation courte.** En-tête : logo, « Outils », « Guides », recherche, thème. Les familles
   d'outils sont dans le menu mobile et sur `/outils/`, pas en ligne dans l'en-tête. Sur mobile, le
   menu liste les familles avec leur icône et compte, en boutons de 44 px minimum.
6. **L'espace de traitement occupe l'espace.** Dans l'éditeur, la page PDF s'ajuste à la largeur
   disponible (pas à la hauteur), et le rendu est net à tout zoom (résolution = zoom ×
   densité de pixels, sans arrondi partiel). Dans le scanner, l'aperçu est fidèle et grand.
7. **Retour visuel immédiat après chaque geste.** Prise de photo → aperçu plein cadre avec
   « Garder » / « Reprendre ». Ajout de page → vignette visible. Export → panneau de résultat.
8. **Rien n'est appliqué sans le dire.** Les filtres du scanner sont un choix explicite, la photo
   d'origine est conservée et montrée par défaut. Les limites (texte non modifiable, police
   remplacée, scan sans texte) sont écrites à l'endroit où elles s'appliquent.
9. **Tactile d'abord sur mobile.** Cibles ≥ 44 px, barre d'outils en bas de l'écran dans
   l'éditeur, boutons pleine largeur pour l'action principale, pas de survol nécessaire.
10. **Rien de cassé.** Routes, identifiants de test, métadonnées SEO, JSON-LD, sitemap et
    `robots.txt` restent valides ; les tests existants sont adaptés quand le libellé change, jamais
    supprimés pour cacher une régression.

## 4. Application aux pages existantes

### Accueil `/`

- Titre principal court (« Des outils simples pour vos fichiers ») + une phrase + **champ de
  recherche large** (soumission → `/outils/?q=`). Pastille « Vos fichiers restent chez vous » réduite
  à une ligne sous la recherche.
- « Outils populaires » : 9 cartes (les outils `featured` du registre, mêmes cartes qu'ailleurs).
- « Par catégorie » : une ligne compacte de 8 familles (icône, nom, nombre d'outils) menant à
  `/pdf/`, `/images/`…
- Lien évident « Voir les 66 outils » vers `/outils/`.
- Le bloc « Comment ça marche » (3 étapes) reste, en une ligne, pour expliquer le modèle local.
- Le JSON-LD `WebSite` est conservé ; son `SearchAction` pointe déjà vers `/outils/?q=`.

### Catalogue `/outils/`

- Remplace la redirection actuelle vers `/` : H1 « Tous les outils », recherche, filtres de
  catégorie (puces sur mobile, colonne sur desktop), grille de cartes par catégorie. Il reçoit
  `?q=` depuis l'accueil et la recherche de l'en-tête. Page indexable (`noindex` retiré car c'est
  une vraie page), ajoutée au sitemap.

### Pages de catégorie `/pdf/`, `/images/`…

- Inchangées dans leur rôle (catalogue filtré) ; elles profitent du nouveau composant de catalogue.

### Pages d'outil `/<catégorie>/<outil>/`

- Au-dessus du pli : fil d'Ariane, H1 réduit (28–36 px), description sur **une** ligne visible
  (le texte complet reste pour le SEO sous l'outil : section « À propos de cet outil »), puis la
  zone d'action immédiatement.
- Badges « Traitement dans votre navigateur / Gratuit » déplacés sous la zone d'action, en texte
  discret.
- Les sections Mode d'emploi, Limites, Confidentialité, FAQ, Guides, Outils associés sont
  conservées à l'identique (contenu SEO non modifié).

### En-tête et navigation

- Desktop : logo · Outils · Guides · [recherche] · thème · langue. Le bouton « Éditeur PDF » est
  retiré de l'en-tête (il est la première carte populaire).
- Mobile : logo · loupe · menu. Le menu liste l'éditeur, les familles d'outils (icône + nom +
  compte), puis Guides / À propos / Contact.

### Zones de traitement de fichiers (tous les outils)

- Les composants partagés (`FileDropzone`, `BusyPanel`, `DonePanel`) ne changent pas de logique ;
  seule la hiérarchie de la page autour d'eux est simplifiée.

### Éditeur PDF (`/pdf/modifier/`, `/pdf/annoter/`, `/pdf/ajouter-du-texte/`, `/pdf/signer/`)

- Ajustement par défaut à la **largeur** de la zone, plafonné pour que la page ne dépasse pas 1,3 ×
  la hauteur visible (texte lisible, l'essentiel de la page à l'écran) ; zoom de 50 % à 400 % ;
  rendu à `zoom × devicePixelRatio` avec taille CSS = taille canvas / ratio (ratio exact) ; pages
  portrait et paysage traitées par leur taille visuelle (rotation `/Rotate` comprise).
- Nouveau mode **« Modifier le texte »** (voir `docs/EDITION_TEXTE.md`) distinct des outils
  d'annotation.

### Scanner (`/numerisation/scanner-un-document/`)

- Flux : caméra → photo → **aperçu plein cadre « Garder / Reprendre »** → page ajoutée avec la photo
  d'origine (filtre « Couleur » par défaut) → recadrer / redresser (quatre coins) / pivoter →
  filtres au choix (Couleur, Gris, Noir et blanc, Document) → ajout de pages (caméra ou import) →
  réordonner / supprimer → PDF multipage.
- L'aperçu caméra montre exactement ce qui sera capturé (plus de recadrage `object-cover`).

## 5. Ce qui ne change pas

- Les jetons de design (couleurs indigo, typographies Bricolage Grotesque / Instrument Sans,
  rayons, ombres) : la refonte simplifie la structure, pas l'identité.
- Les 66 outils, leurs slugs, leurs textes SEO, leurs limites et FAQ.
- Les en-têtes de sécurité, la CSP, le traitement local.

## Annexe — Grille de lecture pour la revue manuelle des références

Pour chaque site, noter : (1) que voit-on au-dessus du pli sur 1 366 px et sur 390 px ; (2) la
recherche est-elle un champ, un bouton, absente ; (3) combien d'outils sont visibles sans défiler
et comment ils sont groupés ; (4) sur une page d'outil, à quelle hauteur commence la zone de dépôt ;
(5) ce qui disparaît de l'écran pendant le traitement ; (6) comment le résultat est présenté
(bouton unique, options, retour au début) ; (7) le menu mobile : nombre d'entrées, taille des
cibles. Comparer avec OUTILIA après refonte, pas avant.

---

# Identité visuelle OUTILIA — version 2 (refonte « plateforme professionnelle »)

Écrit avant l'application. Les sites de référence restent inaccessibles depuis l'environnement
(voir § 1) : les principes ci-dessous s'appuient sur les attentes exprimées, sur les mesures de
l'interface actuelle et sur des patrons documentés d'interfaces d'outils de fichiers, sans copie.

## A. Direction artistique

| Élément | Choix | Pourquoi |
| --- | --- | --- |
| Couleur principale | Indigo OUTILIA `#5146E5` (survol `#4338CA`), teinte douce `#EDEBFD` | Déjà associée à la marque ; distinctive sans être criarde ; contraste AA sur blanc |
| Couleur de confiance | Vert `#12805C` (fond `#E3F6EE`) | Réservée à « traitement local », résultats et états réussis |
| Teintes par famille d'outils | PDF indigo · Numérisation violet · Images turquoise · Texte ambre · Développeur ardoise · Calculs émeraude · Codes rose · Documents bleu ciel | Repérage immédiat dans le catalogue, cartes « distinctes mais cohérentes » |
| Fond | Blanc cassé `#F8F9FC`, surfaces blanches, bordures `#E5E7F0`, halo radial indigo très léger derrière le héros | Lumineux, pas de dégradés décoratifs |
| Typographie | Titres Bricolage Grotesque (800 / 700), texte Instrument Sans (400 / 500 / 600), code monospace système | Déjà chargées ; contraste titres/texte net |
| Échelle | Hero 44–56 px ; H1 32–40 ; H2 24–28 ; H3 18–20 ; corps 15–16 ; secondaire 13–14 | Hiérarchie lisible, pas de titres géants |
| Espacements | 8 px de base ; sections 64–96 px ; cartes 20 px ; gouttières 16–24 px | Généreux sans vide |
| Rayons | 10 px (contrôles), 14 px (cartes), 20–24 px (panneaux) | Cohérent avec la marque |
| Ombres | `sm` repos, `md` au survol (léger relèvement de 2 px), `lg` seulement pour la recherche et les dialogues | Discret |
| Icônes | lucide, trait 1,7, dans une pastille teintée par famille | Un seul jeu |
| Mouvement | 150–200 ms ; survol : bordure + relèvement ; apparition des sections : fondu 4 px ; `prefers-reduced-motion` respecté | Compréhension, pas décoration |

## B. Composants

- **Carte d'outil** : pastille d'icône teintée par famille, nom, description sur deux lignes,
  étiquette de famille en petit ; variante « populaire » (pastille plus grande, trois lignes).
- **Tuile de famille** : grande pastille, nom, nombre d'outils, deux exemples ; fond teinté 8 %.
- **Zone d'import** : panneau clair à bordure pointillée fine, icône dans une pastille, titre, formats
  acceptés, bouton principal ; au survol/glisser : fond indigo doux et bordure pleine.
- **Panneaux de traitement** : « en cours » avec barre et libellé de l'étape, « terminé » avec icône de
  succès, résumé chiffré, **un** bouton principal de téléchargement, actions secondaires discrètes ;
  « erreur » avec cause, correctif et deux actions.
- **Options** : essentielles visibles, avancées repliées (« Options avancées »).
- **États vides** : illustration légère (icône), phrase, action.
- **Navigation** : en-tête logo · Outils · Guides · recherche · thème/langue · bouton « Tous les
  outils » ; menu mobile tactile (lignes ≥ 44 px, familles avec compte) ; pied de page en 4 colonnes.

## C. Déclinaison page par page

- **Accueil** (10 sections) : en-tête ; héros (titre, phrase, recherche) ; 8 outils populaires ; 8
  familles en tuiles ; 4 parcours (travailler sur un PDF, scanner, convertir une image, reconnaître
  du texte) ; 3 engagements (local, sans compte, bibliothèques open source) ; 3 guides ; FAQ (4) ;
  pied de page.
- **Catalogue `/outils/`** : recherche, colonne des familles, outils populaires, familles avec
  **sous-groupes** (PDF : organiser / modifier / convertir / optimiser et sécuriser / analyser ;
  images : retoucher / optimiser et convertir ; développeur : données / encodages / générateurs /
  utilitaires), état vide avec suggestions.
- **Pages d'outil** : titre compact, zone d'action, options, résultat ; contenu éditorial après.
- **Éditeur** : rail d'outils regroupé par tâche (sélection · texte · annotation · insertion) avec
  intitulés de groupe ; zoom visible ; export en haut à droite.
- **Scanner** : caméra plein écran sur mobile, commandes au pouce (déclencheur central 72 px,
  compteur, terminer), vignettes des pages, filtres sans perte de l'original.
- **OCR** : aperçu avec zones de confiance, texte corrigible, options avancées repliées, export.
