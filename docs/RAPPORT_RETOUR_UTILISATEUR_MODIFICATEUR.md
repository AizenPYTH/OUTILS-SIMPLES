# AVEROPDF — Retour utilisateur sur le modificateur PDF : audit et refonte des interactions

Suite de `docs/RAPPORT_MODIFICATEUR_PDF.md`. Captures « avant » et « après » dans
`docs/captures/retour-utilisateur/` (scripts `scripts/capture-editor-interactions.mjs`). Point de
départ : commit `ff9bcfd`, suites vertes (186 Vitest, 194 Playwright + 10 ignorés).

## 1. Causes exactes de chaque problème

### Zoom (« la page dézoome au lieu de zoomer »)

Reproduit par mesure de la taille de la page (script Playwright, Chromium) : les boutons + / −,
Ctrl + molette **au-dessus de la page** et les touches fonctionnaient. Le défaut venait du
**modèle** : le zoom était un multiplicateur d'un « ajustement » recalculé en permanence à
partir de la taille du conteneur. Toute variation du conteneur (ouverture d'un panneau, barre de
défilement qui apparaît, **zoom du navigateur** déclenché par Ctrl + molette hors de la zone de
page ou par Ctrl + « + », fenêtre redimensionnée) rajustait la page, qui pouvait donc rapetisser
au moment même où l'utilisateur voulait l'agrandir. Le pourcentage affiché (« 100 % » = ajusté)
n'était pas une taille réelle, et Ctrl + molette n'était capturé que sur le conteneur de la page.
Trois autres défauts : la page `margin:auto` dans un conteneur défilant rognait son bord gauche /
haut au-delà de la zone ; la molette ne conservait pas le point sous le curseur ; aucun test ne
vérifiait la taille réelle de la page.

### Rectangle (« je dois choisir les caractéristiques avant de dessiner »)

Après le tracé, rien n'était sélectionné, l'outil Rectangle restait actif (un nouveau glisser
créait un second rectangle, reproduit : « 2 éléments ») et la barre du haut ne réglait que les
**valeurs par défaut de l'outil** ; les propriétés d'un objet existant n'étaient pas modifiables
(sauf la couleur du texte). Pas de style de trait, de remplissage distinct du contour, de
duplication, ni de poignées pour les lignes.

### Texte (« impossible de sélectionner le texte en double-cliquant »)

Le cadre de sélection portait le `onDoubleClick` mais avait `pointer-events: none` : le double-clic
n'atteignait jamais le gestionnaire (reproduit : champ absent après double-clic). Avec l'outil
Texte, un clic sur un texte existant créait un **nouveau** bloc vide par-dessus (reproduit :
« 4 éléments »). Chaque frappe créait une étape d'historique. Trois familles de polices seulement
(standard PDF, WinAnsi), pas de souligné ni de fond réglable, redimensionnement du bloc sans effet
à l'export.

## 2. Fichiers modifiés ou créés

- `src/lib/pdf/editor/zoom.ts` (nouveau, pur) : échelle absolue, paliers 25–400 %, molette
  (modes pixel / ligne), ajustements largeur / page, défilement ancré ; `tests/unit/editor-zoom.test.ts`.
- `src/components/pdf/workspace/annotation-workspace.tsx` : modèle de zoom (`manualScale` +
  `fitMode`), Ctrl + molette sur tout l'éditeur avec point sous le curseur, Ctrl + / − / 0,
  conteneur `min-w-full` (plus de rognage), barre flottante, styles par intention, duplication
  (Ctrl + D), Entrée = éditer, recherche (Ctrl + F) avec remplacement, surlignage des résultats.
- `src/components/pdf/workspace/overlay.tsx` : test de collision précis (distance au trait),
  double-clic = édition, outil Texte sur un texte existant = édition, création + saisie = une
  étape, outils « un tir » qui rendent la main à Sélection avec l'objet sélectionné, poignées
  d'extrémité des lignes, poignées d'angle d'un texte = échelle de police, tirets, masque, ligne.
- `src/components/pdf/workspace/floating-bar.tsx` (nouveau) : propriétés de l'objet sélectionné
  (contour, épaisseur, trait, remplissage, opacité, L × H, pointe de flèche, police, taille, gras,
  italique, souligné, alignement, couleur, fond, modifier, dupliquer, supprimer), placée au-dessus
  ou en dessous de l'objet, bornée dans la zone, étapes d'historique coalescées par contrôle.
- `src/components/pdf/workspace/context-bar.tsx` : style par défaut de l'outil actif seulement.
- `src/components/pdf/workspace/types.ts` : outils Ligne et Masque, groupes Sélection / Texte /
  Formes / Annoter / Insérer / Masquer, styles par défaut par intention, raccourcis.
- `src/components/pdf/workspace/use-editor-history.ts` : coalescence, pas d'étape pour un clic
  sans déplacement ou un texte inchangé.
- `src/components/pdf/workspace/side-panel.tsx` : panneau Rechercher / Remplacer ;
  `src/lib/pdf/browser/search.ts` (nouveau).
- `src/lib/pdf/fonts.ts`, `src/lib/pdf/fonts-embed.ts` (nouveau), `public/fonts/*.ttf` +
  `LICENSES.md`, dépendance `@pdf-lib/fontkit` : palette de polices incorporées ; les autres
  outils (tampons, filigrane, Markdown) restent sur les trois polices standard
  (`standardFontFamilies`).
- `src/lib/pdf/annotations/types.ts`, `draw.ts` : styles de trait (`dash`), masque, souligné,
  duplication ; export pdf-lib avec `borderDashArray` / `dashArray`, polices incorporées en
  sous-ensemble, contrôle des glyphes par police.
- Tests : `tests/unit/editor-fonts.test.ts`, `e2e/editor-interactions.spec.ts` (parcours A–E),
  `e2e/editor.spec.ts` et `e2e/audit.spec.ts` adaptés (paliers absolus, nouvelle palette).
- Documentation : `docs/ARCHITECTURE.md`, `docs/KNOWN_LIMITATIONS.md`, registre de l'outil.

## 3. Choix UX et fonctionnalités améliorées

- **Zoom** : 100 % = taille réelle (96 dpi), comme pdf.js, Acrobat et les navigateurs ; paliers
  25, 50, 75, 100, 125, 150, 200, 300, 400 % ; « Ajuster à la largeur » et « Page entière » sont
  deux modes distincts (menu du pourcentage, Ctrl + 0 = largeur) ; un zoom manuel n'est **jamais**
  recalculé (changement de page, panneau, modification du document, redimensionnement) ; en mode
  ajusté, la page suit la fenêtre et les panneaux, ce qui est le sens du mot. Ctrl + molette
  (ou pincement du pavé tactile, qui envoie les mêmes événements) zoome le document, jamais le
  navigateur, par pas de ≈ 16 % par cran, en gardant le point sous le curseur fixe dès que la page
  déborde de la zone (une page plus petite reste centrée). La molette seule défile.
- **Formes** : on dessine d'abord, on règle ensuite. Styles par intention : cadre bleu 2 pt,
  flèche rouge 2,5 pt, surlignage jaune 45 %, soulignement rouge 1,5 pt, masque noir opaque. Après
  le tracé l'objet est sélectionné et l'outil Sélection revient (le dessin à main levée reste
  actif pour enchaîner les traits). Barre flottante au-dessus de l'objet (en dessous près du bord
  haut), jamais hors de la zone, sans masquer l'objet ; les curseurs et couleurs forment une seule
  étape d'annulation par contrôle. Poignées d'angle pour les boîtes, d'extrémité pour les lignes
  et flèches ; clic sur le trait d'une ligne (et non sur sa boîte englobante) pour la choisir.
- **Texte** : clic = sélection, double-clic (ou Entrée, ou le crayon de la barre) = édition dans
  un champ natif où double-clic, triple-clic, Maj + flèches, Ctrl + A, copier-coller fonctionnent
  ; l'outil Texte sur un bloc existant l'édite ; un bloc vide disparaît sans laisser d'étape ;
  création + saisie = une étape. Douze familles vérifiées à l'export (3 standard, 9 incorporées
  avec sous-ensemble, accents et € relus), gras / italique (désactivés quand la police ne les
  a pas), souligné, alignement, couleur, fond ; poignées = taille de police (le bloc suit toujours
  ses métriques, donc l'export est fidèle).
- **Rail par intention** : Sélection · Texte (modifier, ajouter) · Formes (rectangle, ellipse,
  ligne, flèche) · Annoter (dessin, surligner, souligner, commentaire) · Insérer (image,
  signature) · Masquer · Document (Pages, OCR, Rechercher, Infos, Aide) ; export et actions
  avancées dans l'en-tête et son menu.
- **Recherche** : Ctrl + F, résultats par page, surlignage, saut à la page ; « Remplacer » par
  passage ou partout, par le même mécanisme que « Modifier le texte » (limites annoncées).
- Décisions assumées : pas de rotation libre des objets (non pris en charge à l'export, donc pas
  proposé), pas de sélection multiple, pas de reflux de paragraphe (dit à l'écran).

## 4. Tests avant / après

Avant (compilation `ff9bcfd`, scripts de reproduction) : rectangle tracé → 0 cadre de sélection,
outil Rectangle toujours actif, second glisser → « 2 éléments » ; double-clic sur un texte ajouté
→ aucun champ ; outil Texte sur ce texte → « 4 éléments » et champ vide ; zoom : taille de page
631 px → 789 → 947 → 1263 px avec + (fonctionnel dans Chromium), mais pourcentage relatif à
l'ajustement et recalcul à chaque variation du conteneur.

Après (compilation finale) :

- `pnpm typecheck`, `pnpm lint`, `pnpm build` : OK.
- `pnpm test` (Vitest) : **197 tests, 21 fichiers, 0 échec** ; nouveaux : zoom (paliers dans les
  deux sens, + puis − exact, molette symétrique et bornée, ajustements distincts, ancrage), polices
  (fichiers présents, glyphes français par police, repli de style, sous-ensemble < 120 Ko, texte
  relu après export, tirets et souligné dans le flux, duplication).
- Playwright (Chromium desktop + Pixel 7) : **110 parcours × 2 projets = 208 réussis, 12 ignorés volontairement (clavier, molette ou desktop seulement), 0 échec, 4,6 min**. Parcours de réception :
  - **A — zoom** : dix + puis dix − (taille de page mesurée à chaque pas, 400 % puis 25 %),
    100 % → + → − = 100 % à 1 px près, A4 à 100 % = 793 px ; Ctrl + molette haut / bas, point
    sous le curseur conservé à 8 px près, molette seule sans zoom, Ctrl + / − / 0, largeur ≠ page
    entière ; 150 % conservé après changement de page, panneau, dessin ; fenêtre 640 px : la
    page tient en largeur.
  - **B — rectangle** : tracé → sélectionné, outil Sélection, 1 élément ; couleur, épaisseur 6,
    remplissage puis transparent, tireté, déplacement de 100 × 60 px sans création, redimension
    - 50 × 30 px, annuler / rétablir à 1 px, dupliquer / supprimer ; export relu : `1 0 0 RG`,
      `6 w`, `[24 15] 0 d`, pas de remplissage, position en points cohérente, page 2 intacte.
  - **C — texte** : saisie, clic = sélection, double-clic = édition, double-clic sur un mot =
    « Bonjour » sélectionné, Ctrl + A puis frappe, police Liberation Serif 24 pt gras souligné,
    déplacement, annuler / rétablir ; export relu : texte présent, police `LiberationSerif-Bold`
    incorporée, taille 24, trait de soulignement. Outil Texte sur un bloc existant = édition ;
    bloc vide retiré sans étape.
  - **D — plusieurs objets** : texte, flèche, image, ellipse ; flèche choisie sur son trait,
    déplacée, extrémité déplacée ; clic à côté du trait = rien ; texte puis ellipse sélectionnés
    séparément, ellipse immobile ; suppression de l'ellipse ; export : texte, image, trois
    segments de flèche, pas d'ellipse.
  - **E — régression** : recherche sur 5 pages, saut, remplacement d'un passage relu à l'export ;
    les parcours existants (OCR intégré, scan, mixte, mot de passe, pages, signature, édition
    native, 90°, fermeture) passent sans assertion affaiblie.
- Non automatisable ici, procédure manuelle : pincement sur écran tactile réel (Chrome Android
  envoie Ctrl + molette, iOS Safari non vérifié), molette Firefox (mode « lignes » géré par le
  calcul, non exécuté), rendu des polices incorporées sur Safari.

## 5. Captures de l'interface finale

`docs/captures/retour-utilisateur/` : avant (01 rectangle sans sélection, 02 double-clic sans
champ) ; après : 01 zoom 100 % taille réelle, 02 zoom molette ancrée, 03 menu de zoom, 04
rectangle tracé avec barre flottante, 05 propriétés modifiées (rouge, 5 pt, tireté, rempli), 06
formes avec leurs styles par intention, 07 texte en Gelasio 22 pt souligné et sa barre, 08
double-clic qui sélectionne un mot, 09 recherche / remplacement, 10 masque visuel, 11 raccourcis,
12–13 mobile (barre flottante et zoom).

## 6. Bugs restants

- Molette en mode « lignes » (Firefox) : conversion calculée (≈ 33 px par ligne) mais non
  exécutée dans Firefox, absent de l'environnement.
- Sur mobile, la barre flottante se replie sur trois lignes ; elle peut recouvrir le haut de la
  page quand l'objet est tout en haut (placée alors en dessous).
- Un texte ajouté très large reste sur une ligne (pas de reflux) et peut dépasser la page.

## 7. Fonctionnalités non prises en charge (et pourquoi)

| Fonction                                    | Décision                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Rotation libre d'un objet                   | Non proposée : l'export ne la dessine pas ; mieux vaut l'absence qu'un bouton décoratif. |
| Sélection multiple, alignement d'objets     | Non faite (coût d'interaction élevé ; à étudier).                                        |
| Tampons, filigranes, numérotation           | Outils dédiés existants ; non dupliqués dans l'éditeur.                                  |
| Insérer / extraire des pages d'un autre PDF | Outils Fusionner / Extraire / Organiser ; plan de pages mono-source.                     |
| Masquage avec suppression réelle            | Masque visuel seulement (dit à l'écran) ; outil Caviarder pour la suppression.           |
| Comparaison avant / après                   | Non faite ; « Revenir au document d'origine » et l'historique existent.                  |
| Compression avec aperçu de taille           | Outil Compresser dédié.                                                                  |
| Remplacement d'un mot coupé en fragments    | Signalé comme introuvable ; pas de reconstruction.                                       |

## 8. Vérifications qui nécessitent un vrai appareil

- Pincement sur téléphone et tablette (Chrome Android, Safari iOS), molette et pavé tactile sur
  macOS / Windows (sens et vitesse), Firefox et Safari (rendu des polices incorporées, champ de
  texte, barre flottante), écran 3× à 400 %.
- Glisser des poignées au doigt (taille des poignées 16 px sur tactile), saisie au clavier
  virtuel.

## 9. Commit final

Commit `4266906` sur `claude/festive-turing-f4fmzh` (après `ff9bcfd`), poussé. Arbre propre
après le commit de ce rapport ; aucun déploiement, aucune configuration sensible touchée ; une
dépendance ajoutée : `@pdf-lib/fontkit` 1.1.1 (MIT), chargée à la demande (≈ 250 Ko) uniquement
lors de l'export d'une police incorporée ; polices libres ajoutées dans `public/fonts` (licences
jointes). `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` et la suite Playwright
complète ont été exécutés sur cet état.
