/** French source string → English text (see src/lib/i18n/messages.ts). PDF editor workspace. */
export const pdfEditorEn: Record<string, string> = {
  // annotation-workspace.tsx
  "{n} modification(s) impossible(s) : {reasons}.":
    "{n} change(s) could not be applied: {reasons}.",
  "Un caractère est absent de la police d'origine : ce passage utilise une police standard proche.":
    "A character is missing from the original font: this passage uses a close standard font.",
  "La modification du texte a échoué.": "The text change failed.",
  "Texte modifié : « {text} »": "Text changed: “{text}”",
  "Texte d'origine rétabli": "Original text restored",
  "analyse impossible": "analysis failed",
  "Élément dupliqué": "Element duplicated",
  "Élément supprimé": "Element deleted",
  "Signature placée": "Signature placed",
  "Image insérée": "Image inserted",
  "Ce passage est une image (page scannée) : lancez l'OCR pour le rendre modifiable.":
    "This passage is an image (scanned page): run OCR to make it editable.",
  "Le texte de cette page ne peut pas être modifié en toute sécurité.":
    "The text of this page cannot be edited safely.",
  "Passage introuvable dans le flux de la page (texte coupé entre deux fragments).":
    "Passage not found in the page stream (text split between two fragments).",
  "Passage non modifiable : {reason}.": "Passage cannot be edited: {reason}.",
  "police particulière": "unusual font",
  "Le remplacement a échoué.": "The replacement failed.",
  "Aucun passage remplaçable : pages scannées ou polices non modifiables.":
    "No passage can be replaced: scanned pages or non-editable fonts.",
  "{done} passages remplacés sur {total}.": "{done} of {total} passages replaced.",
  "{done} passage remplacé sur {total}.": "{done} of {total} passage replaced.",
  "OCR relancé": "OCR run again",
  "OCR terminé : {words} mots reconnus, qualité estimée {confidence} %.":
    "OCR complete: {words} words recognized, estimated quality {confidence}%.",
  "Le document reconnu n'a pas pu être rouvert.": "The recognized document could not be reopened.",
  "Couche OCR retirée": "OCR layer removed",
  "Couche OCR retirée : le document est revenu à son état d'origine.":
    "OCR layer removed: the document is back to its original state.",
  "Document d'origine rétabli.": "Original document restored.",
  "{n} pages insérées": "{n} pages inserted",
  "{n} page insérée": "{n} page inserted",
  "{n} pages de « {name} » insérées après la page {after}.":
    "{n} pages from “{name}” inserted after page {after}.",
  "{n} page de « {name} » insérée après la page {after}.":
    "{n} page from “{name}” inserted after page {after}.",
  "Application des textes modifiés…": "Applying the edited text…",
  "Intégration des éléments ajoutés…": "Embedding the added elements…",
  "Réorganisation des pages…": "Reorganizing the pages…",
  "Vérification du fichier produit…": "Checking the produced file…",
  "Le fichier produit compte {n} pages au lieu de {expected}.":
    "The produced file has {n} pages instead of {expected}.",
  "Élément déplacé": "Element moved",
  "{n} pages": "{n} pages",
  "{n} page": "{n} page",
  "texte reconnu (OCR)": "recognized text (OCR)",
  "texte natif": "native text",
  "{n} scannées": "{n} scanned",
  "{n} scannée": "{n} scanned",
  "document scanné": "scanned document",
  "sans texte": "no text",
  "{n} éléments": "{n} elements",
  "{n} élément": "{n} element",
  "{n} textes modifiés": "{n} texts edited",
  "{n} texte modifié": "{n} text edited",
  "{n} pages (réorganisées)": "{n} pages (reorganized)",
  "{n} page (réorganisées)": "{n} page (reorganized)",
  déverrouillé: "unlocked",
  "Masquer le panneau des pages": "Hide the pages panel",
  "Afficher le panneau des pages": "Show the pages panel",
  "Reconnaissance de texte (OCR)…": "Text recognition (OCR)…",
  "Rechercher dans le document…": "Search the document…",
  "Informations sur le document": "Document information",
  "Historique des modifications": "Change history",
  "Raccourcis clavier": "Keyboard shortcuts",
  "Ajuster à la largeur": "Fit to width",
  "Afficher la page entière": "Show the whole page",
  "Revenir au document d'origine": "Go back to the original document",
  "Fermer le document": "Close the document",
  Pages: "Pages",
  Rechercher: "Search",
  Infos: "Info",
  Aide: "Help",
  "{n} passages modifiables": "{n} editable passages",
  "{n} passage modifiable": "{n} editable passage",
  "page scannée": "scanned page",
  "page sans texte": "page without text",
  "structure non prise en charge": "unsupported structure",
  "Élément ajouté": "Element added",
  "{n} à l'export (ordre, rotation ou suppression modifiés)":
    "{n} at export (order, rotation or deletion changed)",
  "Zoom {level}{fit} : choisir": "Zoom {level}{fit}: choose",
  "(ajusté à la largeur)": "(fit to width)",
  "(page entière)": "(whole page)",
  "Page entière": "Whole page",
  "Fermer sans télécharger ?": "Close without downloading?",
  "Vos modifications ne sont pas enregistrées : le fichier d'origine reste intact sur votre appareil, et ce qui a été fait ici sera perdu.":
    "Your changes are not saved: the original file stays intact on your device, and what was done here will be lost.",
  "Continuer l'édition": "Keep editing",
  "Fermer sans enregistrer": "Close without saving",

  // context-bar.tsx
  "Afficher toutes les zones de texte modifiables": "Show all editable text zones",
  "Zones de texte": "Text zones",
  "Style par défaut": "Default style",
  Masque: "Mask",
  Texte: "Text",
  Couleur: "Color",
  Police: "Font",
  Taille: "Size",
  Gras: "Bold",
  Italique: "Italic",
  Souligné: "Underlined",
  Alignement: "Alignment",
  "Aligner à gauche": "Align left",
  Centrer: "Center",
  "Aligner à droite": "Align right",
  "Fond du texte": "Text background",
  Fond: "Background",
  "Couleur de fond": "Background color",
  Épaisseur: "Thickness",
  "Épaisseur du trait": "Stroke thickness",
  Trait: "Stroke",
  "Style du trait": "Stroke style",
  Continu: "Solid",
  Tireté: "Dashed",
  Pointillé: "Dotted",
  "Remplir la forme": "Fill the shape",
  Remplissage: "Fill",
  "Couleur de remplissage": "Fill color",
  Opacité: "Opacity",
  "Élément sélectionné : propriétés dans la barre flottante · glisser pour déplacer · Suppr pour supprimer · Ctrl + D pour dupliquer.":
    "Element selected: properties in the floating bar · drag to move · Del to delete · Ctrl + D to duplicate.",

  // editor-header.tsx
  "fermer le document": "close the document",
  modifié: "modified",
  "Télécharger le PDF modifié": "Download the edited PDF",
  "Autres actions": "More actions",

  // export-dialog.tsx
  "{n} éléments ajoutés": "{n} elements added",
  "{n} élément ajouté": "{n} element added",
  "couche de texte OCR": "OCR text layer",
  "pages réorganisées": "pages reorganized",
  "PDF modifié prêt": "Edited PDF ready",
  "Export impossible": "Export failed",
  "Préparation du PDF modifié…": "Preparing the edited PDF…",
  "Aucune modification : le document sera réenregistré tel quel.":
    "No changes: the document will be saved again as is.",
  "Fichier vérifié : {n} pages, {size}, réouvert sans erreur.":
    "File checked: {n} pages, {size}, reopened without error.",
  "Fichier vérifié : {n} page, {size}, réouvert sans erreur.":
    "File checked: {n} page, {size}, reopened without error.",
  "Les éléments ajoutés (texte, dessins, images, signature) sont dessinés dans les pages : ils ne seront plus déplaçables dans un autre lecteur.":
    "The added elements (text, drawings, images, signature) are drawn into the pages: they can no longer be moved in another reader.",
  "Certains caractères non pris en charge par les polices standard ont été remplacés par « ? ».":
    "Some characters not supported by the standard fonts were replaced by “?”.",

  // floating-bar.tsx
  "Propriétés de l'élément sélectionné": "Properties of the selected element",
  Contour: "Outline",
  "Couleur du contour": "Outline color",
  "Épaisseur du contour": "Outline thickness",
  "Remplissage retiré": "Fill removed",
  "Couleur du masque": "Mask color",
  "Masque visuel : le contenu reste dans le fichier. Suppression réelle : outil Caviarder.":
    "Visual mask: the content stays in the file. For real removal, use the Redact tool.",
  L: "W",
  Largeur: "Width",
  Hauteur: "Height",
  "Pointe de flèche": "Arrowhead",
  "Pointe retirée": "Arrowhead removed",
  "Pointe ajoutée": "Arrowhead added",
  Flèche: "Arrow",
  "Taille de l'image": "Image size",
  Signature: "Signature",
  Image: "Image",
  "proportions conservées · rotation : celle de la page":
    "proportions kept · rotation: same as the page",
  "Dupliquer (Ctrl + D)": "Duplicate (Ctrl + D)",
  "Supprimer (Suppr)": "Delete (Del)",
  "Taille du texte": "Text size",
  "Taille (pt)": "Size (pt)",
  "Italique : non disponible pour {font}": "Italic: not available for {font}",
  "cette police": "this font",
  "Couleur du texte": "Text color",
  "Fond retiré": "Background removed",
  "Modifier le texte (double-clic)": "Edit the text (double-click)",
  "{label} : opaque (cliquer pour transparent)": "{label}: opaque (click to make transparent)",
  "{label} : transparent (cliquer pour remplir)": "{label}: transparent (click to fill)",
  "Couleur de {label}": "{label} color",

  // import-diagnosis.tsx
  "Document scanné — {n} pages sans texte sélectionnable":
    "Scanned document — {n} pages without selectable text",
  "Document scanné — {n} page sans texte sélectionnable":
    "Scanned document — {n} page without selectable text",
  "PDF ouvert — {n} pages, dont {scanned} sans texte sélectionnable":
    "PDF opened — {n} pages, {scanned} of them without selectable text",
  "PDF ouvert — {n} pages sans texte ni image":
    "PDF opened — {n} pages with neither text nor image",
  "PDF ouvert — {n} page sans texte ni image": "PDF opened — {n} page with neither text nor image",
  "Les pages analysées ne contiennent ni texte ni image. Vous pouvez ajouter du texte, des formes, des images ou une signature.":
    "The analyzed pages contain neither text nor images. You can add text, shapes, images or a signature.",
  "Ces pages sont des images : leur texte ne peut pas être modifié directement. Lancez l'OCR pour reconnaître le texte (recherche, copie, correction), ou continuez pour annoter, ajouter du texte par-dessus, insérer une signature ou réorganiser les pages.":
    "These pages are images: their text cannot be edited directly. Run OCR to recognize the text (search, copy, correction), or continue to annotate, add text on top, insert a signature or reorganize the pages.",
  "Document long : un échantillon de pages a été analysé.":
    "Long document: a sample of pages was analyzed.",
  "Continuer sans OCR": "Continue without OCR",
  "Lancer l'OCR": "Run OCR",

  // overlay.tsx
  "Dessin ajouté": "Drawing added",
  "Flèche ajoutée": "Arrow added",
  "Soulignement ajouté": "Underline added",
  "Ligne ajoutée": "Line added",
  "Surlignage ajouté": "Highlight added",
  "Masque ajouté": "Mask added",
  "Rectangle ajouté": "Rectangle added",
  "Ellipse ajoutée": "Ellipse added",
  "Élément redimensionné": "Element resized",
  "Extrémité déplacée": "Endpoint moved",
  "Zone d'annotation de la page": "Annotation area of the page",
  "Texte vide retiré": "Empty text removed",
  "Texte saisi": "Text entered",
  "Image ajoutée": "Image added",
  "Texte de l'annotation": "Annotation text",
  "Déplacer le début de la ligne": "Move the start of the line",
  "Déplacer la fin de la ligne": "Move the end of the line",
  "Redimensionner ({handle})": "Resize ({handle})",

  // pages-panel.tsx
  "Page {from} déplacée en {to}": "Page {from} moved to {to}",
  "Page {n} pivotée": "Page {n} rotated",
  "Page {n} dupliquée": "Page {n} duplicated",
  "Page {n} supprimée": "Page {n} deleted",
  "Page {n} déplacée": "Page {n} moved",
  page: "page",
  "Fichier PDF dont les pages seront insérées": "PDF file whose pages will be inserted",
  "Insérer les pages d'un autre PDF après la page {n}":
    "Insert the pages of another PDF after page {n}",
  "Insérer un PDF": "Insert a PDF",
  "Déplacer la page {n}": "Move page {n}",
  "(pivotée de {deg}°)": "(rotated by {deg}°)",
  "(modifiée)": "(modified)",
  "Actions de la page {n}": "Actions for page {n}",
  "Pivoter vers la gauche": "Rotate left",
  "Pivoter vers la droite": "Rotate right",
  "Dupliquer la page": "Duplicate the page",
  "Monter la page": "Move the page up",
  "Descendre la page": "Move the page down",
  "Supprimer la page": "Delete the page",

  // side-panel.tsx
  "Reconnaissance de texte (OCR)": "Text recognition (OCR)",
  Document: "Document",
  Historique: "History",
  "Rechercher dans le document": "Search the document",
  "Fermer le panneau": "Close the panel",
  "Ce document est un scan : ses pages sont des images, sans texte sélectionnable.":
    "This document is a scan: its pages are images, without selectable text.",
  "{n} page(s) sur {total} sont des images sans texte sélectionnable.":
    "{n} of {total} page(s) are images without selectable text.",
  "Ce document contient déjà une couche de texte reconnu (OCR).":
    "This document already contains a recognized text layer (OCR).",
  "Ce document contient du texte natif : l'OCR n'est utile que pour des pages images.":
    "This document contains native text: OCR is only useful for image pages.",
  "Aucun texte ni image détectés sur les pages analysées.":
    "No text or image detected on the analyzed pages.",
  "Seul un échantillon de pages a été analysé (document long).":
    "Only a sample of pages was analyzed (long document).",
  "Le document n'a pas pu être analysé ; vous pouvez lancer l'OCR sur toutes les pages.":
    "The document could not be analyzed; you can run OCR on all pages.",
  "OCR terminé": "OCR complete",
  "{n} pages reconnues": "{n} pages recognized",
  "{n} page reconnue": "{n} page recognized",
  "{n} mots": "{n} words",
  "{n} mot": "{n} word",
  "Langue : {lang}": "Language: {lang}",
  "Qualité estimée :": "Estimated quality:",
  "vérifiez le texte avec « Modifier le texte »": "check the text with “Edit text”",
  "Le texte reconnu est une couche invisible alignée sur l'image (recherche, copie, correction). L'image d'origine est conservée ; l'éditeur ne reproduit pas la police du scan.":
    "The recognized text is an invisible layer aligned on the image (search, copy, correction). The original image is kept; the editor does not reproduce the font of the scan.",
  "Revenir au document sans OCR": "Go back to the document without OCR",
  "Page {n} sur {total}": "Page {n} of {total}",
  "Progression de l'OCR": "OCR progress",
  Interrompre: "Stop",
  "Langue du document": "Document language",
  "Pages à reconnaître": "Pages to recognize",
  "Pages sans texte ({n})": "Pages without text ({n})",
  "Toutes les pages ({n})": "All pages ({n})",
  "OCR interrompu : le document est inchangé.": "OCR stopped: the document is unchanged.",
  "Relancer l'OCR": "Run OCR again",
  "Moteur Tesseract exécuté dans votre navigateur (≈ 15 Mo chargés une fois) ; comptez quelques secondes par page. Rien n'est envoyé sur un serveur.":
    "Tesseract engine running in your browser (≈ 15 MB loaded once); allow a few seconds per page. Nothing is sent to a server.",
  Fichier: "File",
  Contenu: "Content",
  "Texte reconnu (OCR)": "Recognized text (OCR)",
  "Texte natif": "Native text",
  "Mixte : {text} avec texte, {scanned} image(s)": "Mixed: {text} with text, {scanned} image(s)",
  "Scanné (images)": "Scanned (images)",
  "Pages vides": "Empty pages",
  "Non analysé": "Not analyzed",
  Protection: "Protection",
  "Mot de passe retiré pour l'édition (copie locale)": "Password removed for editing (local copy)",
  "{n} page(s), qualité {confidence} %": "{n} page(s), quality {confidence}%",
  "Textes modifiés": "Texts edited",
  "Éléments ajoutés": "Elements added",
  "Le fichier d'origine n'est jamais modifié : le PDF téléchargé est une nouvelle copie.":
    "The original file is never modified: the downloaded PDF is a new copy.",
  "{n} étape(s) annulée(s) : Rétablir pour les reprendre.":
    "{n} step(s) undone: Redo to bring them back.",
  "Mot ou expression": "Word or phrase",
  "Remplacer par": "Replace with",
  "Le remplacement réécrit le passage dans la page comme « Modifier le texte » (même police quand c'est possible, sans reflux). Les passages scannés ou non modifiables sont signalés.":
    "The replacement rewrites the passage in the page like “Edit text” (same font when possible, no reflow). Scanned or non-editable passages are reported.",
  "Remplacer partout ({n})": "Replace everywhere ({n})",
  "Recherche…": "Searching…",
  "page {done} / {total}": "page {done} / {total}",
  "Saisissez un texte à chercher. La recherche ignore la casse et les accents ; un mot coupé entre deux fragments n'est pas trouvé.":
    "Enter text to search for. The search ignores case and accents; a word split between two fragments is not found.",
  "{n} résultats": "{n} results",
  "{n} résultat": "{n} result",
  "(affichage limité)": "(display limited)",
  "Page {n}": "Page {n}",
  "Remplacer ce passage": "Replace this passage",
  Remplacer: "Replace",

  // signature-dialog.tsx
  "Tracez votre signature avant de valider.": "Draw your signature before confirming.",
  "Saisissez votre nom.": "Enter your name.",
  "Ajouter une signature": "Add a signature",
  "Signature visuelle : elle est dessinée sur la page et n'a pas la valeur d'une signature électronique qualifiée.":
    "Visual signature: it is drawn on the page and does not have the value of a qualified electronic signature.",
  Dessiner: "Draw",
  Taper: "Type",
  Importer: "Import",
  "Couleur du trait": "Stroke color",
  Effacer: "Clear",
  "Votre nom": "Your name",
  Aperçu: "Preview",
  "Un PNG à fond transparent donne le meilleur résultat.":
    "A PNG with a transparent background gives the best result.",
  "Utiliser cette signature": "Use this signature",
  "Zone de signature : dessinez avec la souris ou le doigt":
    "Signature area: draw with the mouse or your finger",

  // text-edit-layer.tsx
  "Texte reconnu : {text}": "Recognized text: {text}",
  "Modifier « {text} »": "Edit “{text}”",
  "Nouveau texte": "New text",
  "Texte reconnu par OCR : Entrée corrige la couche de texte (recherche, copie) ; l'image reste telle quelle.":
    "Text recognized by OCR: Enter corrects the text layer (search, copy); the image stays as it is.",
  "Entrée : valider · Échap : annuler · le texte qui suit sur la ligne n'est pas décalé":
    "Enter: confirm · Esc: cancel · the text that follows on the line is not shifted",
  "Réécrire visiblement (fond uni, police standard)":
    "Rewrite visibly (solid background, standard font)",
  "Police d'origine non réutilisable : police standard proche.":
    "Original font cannot be reused: close standard font.",
  "Texte d'origine": "Original text",
  "Application de la modification…": "Applying the change…",
  "Reconnaissance du texte en cours : les passages seront modifiables une fois l'OCR terminé.":
    "Text recognition in progress: the passages will be editable once OCR is complete.",
  "Analyse du texte de la page…": "Analyzing the text of the page…",
  "Cette page est une image (document scanné) : son texte ne peut pas être modifié directement. Reconnaissez-le ici, ou ajoutez du texte par-dessus avec « Ajouter du texte ».":
    "This page is an image (scanned document): its text cannot be edited directly. Recognize it here, or add text on top with “Add text”.",
  "outil OCR complet": "full OCR tool",
  "Aucun texte sur cette page. Utilisez « Ajouter du texte » pour en ajouter.":
    "No text on this page. Use “Add text” to add some.",
  "Le texte de cette page ne peut pas être modifié en toute sécurité (structure inhabituelle : {detail}). Vous pouvez toujours ajouter du texte par-dessus.":
    "The text of this page cannot be edited safely (unusual structure: {detail}). You can still add text on top.",
  "Aucun passage modifiable sur cette page (police particulière ou écriture verticale).":
    "No editable passage on this page (unusual font or vertical writing).",
  "Texte reconnu par OCR": "Text recognized by OCR",
  "(qualité estimée {q} %)": "(estimated quality {q}%)",
  "{n} passages": "{n} passages",
  "{n} passage": "{n} passage",
  "Cliquez pour corriger la couche de texte ; cochez « réécrire visiblement » pour changer l'image.":
    "Click to correct the text layer; tick “rewrite visibly” to change the image.",

  // toolbar.tsx / types.ts
  "Outils d'édition": "Editing tools",
  Sélection: "Select",
  "Modifier le texte": "Edit text",
  "Ajouter du texte": "Add text",
  Commentaire: "Note",
  Dessin: "Draw",
  Surligner: "Highlight",
  Souligner: "Underline",
  Rectangle: "Rectangle",
  Ellipse: "Ellipse",
  Ligne: "Line",
  "Cliquez sur un élément pour le sélectionner ; glissez pour le déplacer ; double-cliquez sur un texte pour le modifier.":
    "Click an element to select it; drag to move it; double-click a text to edit it.",
  "Cliquez sur un passage du document pour remplacer son texte (même police quand c'est possible).":
    "Click a passage of the document to replace its text (same font when possible).",
  "Cliquez sur la page pour placer un texte ; cliquez sur un texte ajouté pour le modifier.":
    "Click the page to place a text; click an added text to edit it.",
  "Cliquez sur la page pour ajouter une note sur fond jaune.":
    "Click the page to add a note on a yellow background.",
  "Dessinez à main levée sur la page.": "Draw freehand on the page.",
  "Tracez un rectangle sur la zone à surligner.": "Draw a rectangle over the area to highlight.",
  "Tracez un trait sous le passage à souligner.": "Draw a line under the passage to underline.",
  "Tracez un rectangle, puis réglez contour, remplissage et trait sur l'objet.":
    "Draw a rectangle, then adjust outline, fill and stroke on the object.",
  "Tracez une ellipse, puis réglez contour, remplissage et trait sur l'objet.":
    "Draw an ellipse, then adjust outline, fill and stroke on the object.",
  "Tracez une ligne ; ses extrémités restent réglables.":
    "Draw a line; its endpoints remain adjustable.",
  "Tracez une flèche du point de départ vers la cible.":
    "Draw an arrow from the starting point to the target.",
  "Tracez une zone opaque pour masquer visuellement un contenu (les données restent dans le fichier : pour les supprimer, utilisez l'outil Caviarder).":
    "Draw an opaque area to visually mask content (the data stays in the file: to remove it, use the Redact tool).",
  "Choisissez une image PNG ou JPEG : elle sera placée au centre de la page.":
    "Choose a PNG or JPEG image: it will be placed in the center of the page.",
  "Dessinez, tapez ou importez votre signature, puis placez-la sur la page.":
    "Draw, type or import your signature, then place it on the page.",
  Formes: "Shapes",
  Annoter: "Annotate",
  Insérer: "Insert",
  Masquer: "Mask",
  "Ctrl + Z / Ctrl + Maj + Z": "Ctrl + Z / Ctrl + Shift + Z",
  "Annuler / rétablir (ajouts, textes modifiés, pages)":
    "Undo / redo (additions, edited texts, pages)",
  "Dupliquer l'élément sélectionné": "Duplicate the selected element",
  Suppr: "Del",
  "Supprimer l'élément sélectionné": "Delete the selected element",
  "Flèches (+ Maj)": "Arrow keys (+ Shift)",
  "Déplacer l'élément sélectionné de 1 pt (10 pt)": "Move the selected element by 1 pt (10 pt)",
  "Entrée / double-clic": "Enter / double-click",
  "Modifier le texte sélectionné (sélection d'un mot au double-clic dans le champ)":
    "Edit the selected text (double-click in the field selects a word)",
  Échap: "Esc",
  "Terminer la saisie, désélectionner, revenir à Sélection, fermer un panneau":
    "Finish typing, deselect, go back to Select, close a panel",
  "Page suiv. / Page préc.": "Page Down / Page Up",
  "Page suivante / précédente": "Next / previous page",
  "Ctrl + molette": "Ctrl + scroll wheel",
  "Zoom progressif autour du curseur": "Gradual zoom around the cursor",
  "Zoom avant / arrière / ajuster à la largeur (aussi sans Ctrl hors d'un champ)":
    "Zoom in / out / fit to width (also without Ctrl outside a field)",
  "Choisir un outil (voir l'info-bulle de chaque outil)": "Choose a tool (see each tool's tooltip)",
  "Afficher cette aide": "Show this help",

  // use-editor-history.ts
  "Document ouvert": "Document opened",
  Déplacement: "Move",

  // use-editor-ocr.ts
  "Lecture à l'endroit": "Reading upright",
  "Lecture du texte tourné à 90°": "Reading text rotated 90°",
  "Lecture du texte à l'envers": "Reading upside-down text",
  "Lecture du texte tourné à 270°": "Reading text rotated 270°",
  Reconnaissance: "Recognizing",
  "Chargement du moteur": "Loading the engine",
  "Initialisation du moteur": "Initializing the engine",
  "Chargement du modèle de langue": "Loading the language model",
  Préparation: "Preparing",
  "Chargement du moteur OCR…": "Loading the OCR engine…",
  "Rendu de la page {n}": "Rendering page {n}",
  "{label} · page {n}": "{label} · page {n}",
  "Écriture de la couche de texte…": "Writing the text layer…",
  "La reconnaissance du texte a échoué.": "Text recognition failed.",
};
