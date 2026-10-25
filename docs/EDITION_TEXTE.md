# Édition du texte existant d'un PDF : étude et implémentation

## 1. Le problème

Un PDF ne contient pas de paragraphes : chaque page est une suite d'opérateurs de dessin. Le
texte est écrit par des opérateurs `Tj`, `TJ`, `'` et `"` qui reçoivent des **codes de caractères**
(pas des lettres Unicode) interprétés par la police courante (`Tf`), à une position fixée par la
matrice de texte. Rien ne relie un mot au suivant, rien n'indique où une ligne « reflue ».
Modifier « fidèlement » un texte suppose donc trois choses :

1. retrouver quel opérateur dessine le passage cliqué ;
2. réencoder le nouveau texte avec la police d'origine (qui est souvent un **sous-ensemble** ne
   contenant que les glyphes utilisés dans le document) ;
3. accepter que la mise en page ne soit pas recalculée (pas de moteur de composition).

## 2. Solutions étudiées

| Piste                                                                            | Faisabilité navigateur, sans API payante                                    | Décision                                                                                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Recouvrir l'ancien texte d'un rectangle blanc et écrire par-dessus               | Triviale                                                                    | **Refusée** (demande explicite) : le texte d'origine reste dans le fichier, la recherche et la copie le trouvent, c'est une simulation. |
| Réécrire toute la page (rasteriser puis redessiner)                              | Possible                                                                    | Refusée : perte du texte réel, du vectoriel et de la qualité.                                                                           |
| Réencoder la police d'origine avec de nouveaux glyphes (sous-ensemble incomplet) | Très lourde (parsing TrueType/CFF, tables cmap/glyf…), fragile              | Hors périmètre ; une police standard remplace le passage dans ce cas et l'utilisateur en est informé.                                   |
| **Remplacer l'opérateur de texte dans le flux de contenu**                       | Oui : tokenizer maison + pdf.js (liste d'opérateurs) + pdf-lib (réécriture) | **Retenue.**                                                                                                                            |

Bibliothèques open source examinées : pdf.js (rendu, liste d'opérateurs, glyphes décodés : déjà
présent), pdf-lib (lecture/écriture des flux : déjà présent). pdf-lib n'expose pas d'analyseur de
flux de contenu : un tokenizer de ~250 lignes a été écrit (`src/lib/pdf/content/tokenizer.ts`),
testé en Node. Aucune dépendance ajoutée.

## 3. Fonctionnement

1. **Analyse de la page** (`src/lib/pdf/text-edit/extract-runs.ts`, navigateur) : la liste
   d'opérateurs pdf.js est rejouée avec les mathématiques standard de l'espace texte
   (ISO 32000-1 §9.4.4) : matrices `Tm`/`cm`, `Tf`, `Tc`, `Tw`, `Tz`, `TL`, `Ts`, `Tr`. Chaque
   `showText` de niveau page donne un **passage** : texte décodé (Unicode des glyphes), origine,
   largeur d'avance, taille de police effective, angle. Pour chaque police, la table
   « caractère → code » est reconstituée à partir des glyphes réellement rencontrés sur la page,
   et la largeur des codes (1 ou 2 octets) est déduite en comparant le nombre d'octets de la chaîne
   brute au nombre de glyphes. Pour une police simple **non sous-ensemble** (pas de préfixe
   `ABCDEF+`), la table est complétée avec tout ce que son `/Encoding` nomme (via une liste de noms
   de glyphes Latin), de sorte qu'un « è » absent de la page reste écrit avec la police d'origine ;
   pour un sous-ensemble, seuls les glyphes vus sur la page sont considérés présents.
2. **Alignement** : en parallèle, le flux brut de la page est tokenisé et ses opérateurs
   `Tj`/`TJ`/`'`/`"` de niveau page sont comptés. Le n-ième `showText` de pdf.js correspond au
   n-ième opérateur brut. Si les comptes diffèrent (fonte absente, structure inhabituelle), la page
   est déclarée **non modifiable** plutôt que devinée.
3. **Application** (`src/lib/pdf/text-edit/apply.ts`, Node et navigateur) : l'opérateur visé est
   remplacé **en place** par octets, le reste du flux est conservé tel quel (position, couleur,
   mode de rendu inchangés) :
   - si tous les caractères saisis ont un code dans la police d'origine : `<codes> Tj` (ou un
     tableau `TJ` avec un écart de −250 pour une espace absente de la police) ;
   - sinon : `/FOutilia taille Tf <texte WinAnsi> Tj /FOrigine taille Tf`, avec une police standard
     choisie d'après la police d'origine (serif / sans / monospace, gras, italique) et un rapport
     signalant le remplacement ;
   - les opérateurs `'` et `"` sont réécrits avec leur saut de ligne (`T*`, `Tw`, `Tc`) préservé.
4. **Aperçu honnête** : après chaque validation, le document est **réellement modifié** en mémoire
   et la page est réaffichée à partir du résultat (pdf.js). L'éditeur ne montre jamais une
   approximation HTML du résultat.
5. **Export** : les modifications de texte sont appliquées d'abord, puis les annotations sont
   dessinées par-dessus (pipeline existant).

## 4. Ce qui est pris en charge, ce qui ne l'est pas

Pris en charge :

- texte réel des pages (polices simples 1 octet et composites Identity 2 octets) ;
- réencodage avec la police d'origine quand les glyphes existent (mêmes forme, taille, couleur) ;
- repli vers Helvetica / Times / Courier (gras, italique) pour un caractère absent, avec message ;
- pages pivotées (`/Rotate`), texte tourné (boîte englobante), plusieurs modifications par page,
  retour au texte d'origine passage par passage.

Non pris en charge (indiqué dans l'interface au moment où cela se présente) :

- **documents scannés** : pas de texte → message et lien vers l'outil OCR ;
- texte invisible (couche OCR, `Tr 3`/`7`), polices Type 3, écriture verticale ;
- texte situé dans des XObjects de formulaire, des annotations ou des champs AcroForm (seul le
  flux de la page est modifiable) ;
- **reflux** : le texte qui suit sur la ligne n'est pas décalé ; un passage plus long peut
  chevaucher la suite, un passage plus court laisse un blanc. L'utilisateur voit le résultat réel
  avant d'exporter ;
- crénage d'un `TJ` d'origine : remplacé par un `Tj` simple (espacement par défaut de la police) ;
- Annuler/Rétablir du haut de l'éditeur portent sur les ajouts ; les textes modifiés se
  rétablissent un à un (« Texte d'origine »).

## 5. Vérifications effectuées

- Tests unitaires (`tests/unit/text-edit.test.ts`) : tokenizer (chaînes imbriquées, tableaux,
  images en ligne, plages d'octets), collecte des opérateurs avec état de police, encodage
  original / repli, application sur un PDF généré : l'ancien texte disparaît du flux, le nouveau
  est extrait comme texte réel par pdf.js, aucun rectangle n'est ajouté ; cas de repli de police
  (`Café ☕` → police standard, `☕` remplacé) ; erreurs rapportées, jamais devinées.
- Test de bout en bout (`e2e/editor.spec.ts`) : modification dans l'interface, réaffichage,
  export, relecture du texte exporté.
- Non vérifié : PDF produits par des logiciels variés avec polices composites non Identity,
  documents de plusieurs dizaines de Mo (l'aperçu réel recharge le document à chaque validation :
  temps proportionnel à la taille du fichier).
