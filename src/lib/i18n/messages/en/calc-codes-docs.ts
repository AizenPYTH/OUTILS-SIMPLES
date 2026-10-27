/** French source string → English text (see src/lib/i18n/messages.ts). Codes, printable documents, file detection. */
export const calcCodesDocsEn: Record<string, string> = {
  // --- Barcode generator (components/codes/barcode-tool.tsx, lib/codes/barcode.ts)
  "Rendu PNG impossible.": "PNG rendering failed.",
  "Export PNG impossible.": "PNG export failed.",
  "Type de code": "Code type",
  "Contenu — {hint}": "Content — {hint}",
  "Clé de contrôle calculée : le code complet est {code}.":
    "Check digit computed: the full code is {code}.",
  "Code-barres {type} : {code}": "{type} barcode: {code}",
  "Saisissez un contenu valide pour afficher le code-barres.":
    "Enter valid content to display the barcode.",
  "Largeur d'un module : {n} px": "Module width: {n} px",
  "Hauteur des barres : {n} px": "Bar height: {n} px",
  "Afficher le texte sous les barres": "Show the text under the bars",
  Barres: "Bars",
  Fond: "Background",
  "Télécharger en PNG": "Download as PNG",
  "Télécharger en SVG": "Download as SVG",
  "Pour l'impression, gardez un fort contraste (barres sombres sur fond clair) et une zone blanche autour du code. Testez toujours le code avec une douchette ou l'application du destinataire.":
    "For printing, keep a strong contrast (dark bars on a light background) and a white area around the code. Always test the code with a scanner or the recipient's app.",
  "12 ou 13 chiffres (produits en Europe)": "12 or 13 digits (products in Europe)",
  "7 ou 8 chiffres (petits emballages)": "7 or 8 digits (small packaging)",
  "11 ou 12 chiffres (Amérique du Nord)": "11 or 12 digits (North America)",
  "Texte ASCII, logistique, étiquettes": "ASCII text, logistics, labels",
  "Majuscules, chiffres, - . $ / + % espace": "Uppercase letters, digits, - . $ / + % space",
  "EAN-13 : saisissez 12 chiffres (ou 13 avec la clé).":
    "EAN-13: enter 12 digits (or 13 with the check digit).",
  "Clé de contrôle incorrecte : attendue {check}.": "Incorrect check digit: expected {check}.",
  "EAN-8 : saisissez 7 chiffres (ou 8 avec la clé).":
    "EAN-8: enter 7 digits (or 8 with the check digit).",
  "UPC-A : saisissez 11 chiffres (ou 12 avec la clé).":
    "UPC-A: enter 11 digits (or 12 with the check digit).",
  "Saisissez le texte à encoder.": "Enter the text to encode.",
  "Code 128 : 80 caractères maximum pour rester lisible.":
    "Code 128: 80 characters maximum to stay readable.",
  "Caractère non pris en charge par le Code 128 (sous-ensemble B) : « {ch} ».":
    "Character not supported by Code 128 (subset B): “{ch}”.",
  "Code 39 : 40 caractères maximum pour rester lisible.":
    "Code 39: 40 characters maximum to stay readable.",
  "Caractère non pris en charge par le Code 39 : « {ch} ». Autorisés : A-Z, 0-9, espace, - . $ / + %":
    "Character not supported by Code 39: “{ch}”. Allowed: A-Z, 0-9, space, - . $ / + %",

  // --- Color converter and image palette (components/codes/color-tool.tsx, lib/codes/color.ts)
  Copier: "Copy",
  Pipette: "Eyedropper",
  "Couleur (HEX, rgb(), hsl() ou nom CSS)": "Color (HEX, rgb(), hsl() or CSS name)",
  "Couleur non reconnue. Exemples : #5146e5, rgb(81, 70, 229), hsl(244, 75%, 59%), tomato.":
    "Unrecognized color. Examples: #5146e5, rgb(81, 70, 229), hsl(244, 75%, 59%), tomato.",
  "Nuances et complémentaire": "Shades and complementary",
  "Contraste avec un fond (WCAG 2.1)": "Contrast with a background (WCAG 2.1)",
  "Choisir la couleur de fond": "Choose the background color",
  "Exemple de texte · ratio {ratio}:1": "Sample text · ratio {ratio}:1",
  "AA texte normal (≥ 4,5)": "AA normal text (≥ 4.5)",
  "AA grand texte (≥ 3)": "AA large text (≥ 3)",
  "AAA texte normal (≥ 7)": "AAA normal text (≥ 7)",
  "AAA grand texte (≥ 4,5)": "AAA large text (≥ 4.5)",
  "Composants d'interface (≥ 3)": "UI components (≥ 3)",
  "{label} : {status}": "{label}: {status}",
  conforme: "pass",
  insuffisant: "fail",
  "Image illisible.": "Unreadable image.",
  "Déposez une image pour en extraire les couleurs": "Drop an image to extract its colors",
  "JPG, PNG, WebP · {size} max": "JPG, PNG, WebP · {size} max",
  "Choisir une image": "Choose an image",
  "Nombre de couleurs : {n}": "Number of colors: {n}",
  "Variables CSS": "CSS variables",
  Recalculer: "Recompute",
  "Plus clair (+20)": "Lighter (+20)",
  "Plus clair (+10)": "Lighter (+10)",
  Couleur: "Color",
  "Plus foncé (−10)": "Darker (−10)",
  "Plus foncé (−20)": "Darker (−20)",
  Complémentaire: "Complementary",

  // --- QR code generator (components/codes/qr-generator-tool.tsx, lib/codes/qr.ts)
  "Impossible de générer ce QR code (contenu trop long ?).":
    "This QR code could not be generated (content too long?).",
  Lien: "Link",
  Texte: "Text",
  "Adresse web": "Web address",
  "https://exemple.fr": "https://example.com",
  "Nom du réseau (SSID)": "Network name (SSID)",
  "Mot de passe": "Password",
  Sécurité: "Security",
  "Aucune (réseau ouvert)": "None (open network)",
  "Réseau masqué": "Hidden network",
  Prénom: "First name",
  Nom: "Last name",
  Téléphone: "Phone",
  "E-mail": "Email",
  Organisation: "Organization",
  "Site web": "Website",
  "Taille (px)": "Size (px)",
  "Marge (modules)": "Margin (modules)",
  "Correction d'erreur": "Error correction",
  "L (7 %) – plus petit": "L (7%) – smallest",
  "M (15 %) – standard": "M (15%) – standard",
  "Q (25 %)": "Q (25%)",
  "H (30 %) – plus robuste": "H (30%) – most robust",
  "Couleur des modules": "Module color",
  "Couleur de fond": "Background color",
  "Gardez un bon contraste (modules sombres sur fond clair) et testez le QR code avec votre téléphone avant impression. Un contenu long produit un code plus dense, donc plus difficile à lire en petit format.":
    "Keep a good contrast (dark modules on a light background) and test the QR code with your phone before printing. Long content produces a denser code, which is harder to read at small sizes.",
  "Aperçu du QR code": "QR code preview",
  "Saisissez un contenu pour générer le QR code.": "Enter content to generate the QR code.",
  "Copier le contenu encodé": "Copy the encoded content",
  "Texte trop long pour un QR code lisible (2 000 caractères max).":
    "Text too long for a readable QR code (2,000 characters max).",
  "Indiquez le mot de passe du réseau (ou choisissez « Aucune »).":
    "Enter the network password (or choose “None”).",

  // --- QR code reader (components/codes/qr-reader-tool.tsx)
  "Lien web": "Web link",
  "Réseau Wi-Fi": "Wi-Fi network",
  "Carte de visite (vCard)": "Business card (vCard)",
  "Adresse e-mail": "Email address",
  "Numéro de téléphone": "Phone number",
  "Position géographique": "Geographic location",
  "Déposez une image contenant un QR code": "Drop an image containing a QR code",
  "Photo ou capture d'écran · JPG, PNG, WebP · {size} max":
    "Photo or screenshot · JPG, PNG, WebP · {size} max",
  "Photographier un QR code": "Take a photo of a QR code",
  "Image analysée": "Analyzed image",
  "Lecture en cours…": "Reading…",
  "Aucun QR code lisible": "No readable QR code",
  "Essayez une photo plus nette, mieux éclairée et cadrée sur le code (le QR code doit occuper au moins un quart de l'image). Les codes-barres linéaires ne sont pas pris en charge.":
    "Try a sharper, better-lit photo framed on the code (the QR code should fill at least a quarter of the image). Linear barcodes are not supported.",
  Réseau: "Network",
  "(aucun)": "(none)",
  "Copier le contenu": "Copy the content",
  "Ouvrir le lien (nouvel onglet)": "Open the link (new tab)",
  "Vérifiez l'adresse avant d'ouvrir : un QR code peut mener vers un site frauduleux.":
    "Check the address before opening it: a QR code can lead to a fraudulent site.",

  // --- Markdown / text to PDF (components/documents/markdown-pdf-tool.tsx)
  [`# Compte rendu de réunion

**Date :** 12 mars 2026 · **Participants :** équipe produit

## Décisions

1. Lancer la version 2 le *15 avril*.
2. Garder le traitement **100 % local** des fichiers.

## Actions

- [x] Rédiger la documentation
- [ ] Préparer la communication

> Les outils simples sont ceux qu'on utilise vraiment.

| Sujet | Responsable | Échéance |
| --- | --- | --- |
| Tests | Claire | 1er avril |
| Design | Karim | 8 avril |

Plus d'informations : [outilia.fr](https://outilia.fr/)
`]: `# Meeting notes

**Date:** March 12, 2026 · **Attendees:** product team

## Decisions

1. Launch version 2 on *April 15*.
2. Keep file processing **100% local**.

## Actions

- [x] Write the documentation
- [ ] Prepare the announcement

> Simple tools are the ones people actually use.

| Topic | Owner | Due |
| --- | --- | --- |
| Tests | Claire | April 1 |
| Design | Karim | April 8 |

More information: [outilia.fr](https://outilia.fr/)
`,
  "Votre PDF est prêt": "Your PDF is ready",
  "{n} page": "{n} page",
  "{n} pages": "{n} pages",
  "À vérifier": "Please check",
  "Certains caractères (emoji, alphabets non latins, symboles) ne sont pas disponibles dans les polices PDF standard et ont été remplacés par « ? ».":
    "Some characters (emoji, non-Latin alphabets, symbols) are not available in the standard PDF fonts and were replaced with “?”.",
  "Modifier le texte": "Edit the text",
  Aperçu: "Preview",
  "Texte Markdown": "Markdown text",
  "# Titre": "# Title",
  "Votre texte avec **gras**, listes, tableaux…": "Your text with **bold**, lists, tables…",
  "Insérer un exemple": "Insert an example",
  "Collez votre texte : les sauts de ligne sont conservés, les lignes vides séparent les paragraphes.":
    "Paste your text: line breaks are kept, blank lines separate paragraphs.",
  "Titre (facultatif, en tête du document)": "Title (optional, at the top of the document)",
  "Compte rendu": "Meeting notes",
  "Nom du fichier": "File name",
  Police: "Font",
  "Taille du texte": "Text size",
  Marges: "Margins",
  "Étroites (1,3 cm)": "Narrow (1.3 cm)",
  "Normales (2 cm)": "Normal (2 cm)",
  "Larges (2,5 cm)": "Wide (2.5 cm)",
  "Format de page": "Page size",
  "Numéroter les pages": "Number the pages",
  "Créer le PDF": "Create the PDF",

  // --- Printable paper, calendar, cover page (components/documents/printables-tool.tsx)
  "A4 paysage": "A4 landscape",
  Quadrillé: "Grid",
  "Petits carreaux": "Small squares",
  Ligné: "Lined",
  "Lignes horizontales": "Horizontal lines",
  Pointillé: "Dotted",
  "Grille de points (bullet journal)": "Dot grid (bullet journal)",
  Seyès: "Seyes (French ruled)",
  "Grands carreaux français": "Large French squares",
  Millimétré: "Millimeter",
  Isométrique: "Isometric",
  Musique: "Music",
  Portées: "Staves",
  "Type de feuille": "Paper type",
  "Espacement : {n} mm": "Spacing: {n} mm",
  "Marge : {n} mm": "Margin: {n} mm",
  "Nombre de pages": "Number of pages",
  "Couleur des traits": "Line color",
  "Gris clair": "Light gray",
  "Titre en haut de page (facultatif)": "Title at the top of the page (optional)",
  "Nom, matière, date…": "Name, subject, date…",
  "Imprimez à l'échelle 100 % (sans « ajuster à la page ») pour conserver les dimensions exactes des carreaux.":
    "Print at 100% scale (without “fit to page”) to keep the exact dimensions of the squares.",
  Vue: "View",
  "Un mois par page": "One month per page",
  "Cases larges, zone de notes": "Large cells, notes area",
  "Année complète": "Full year",
  "12 mois sur une page": "12 months on one page",
  Année: "Year",
  Mois: "Month",
  "Marquer les jours fériés français": "Mark French public holidays",
  "Colonne de notes": "Notes column",
  "Créer le calendrier": "Create the calendar",
  "Certains caractères (emoji, alphabets non latins) ont été remplacés par « ? ».":
    "Some characters (emoji, non-Latin alphabets) were replaced with “?”.",
  Titre: "Title",
  "Rapport de stage": "Internship report",
  "Sous-titre": "Subtitle",
  "Développement d'une plateforme d'outils en ligne": "Development of an online tools platform",
  Auteur: "Author",
  "Prénom Nom": "First name Last name",
  "Organisation / établissement": "Organization / institution",
  "Université, entreprise, classe…": "University, company, class…",
  "Juin 2026": "June 2026",
  "Pied de page": "Footer",
  "Confidentiel · Version 1.0": "Confidential · Version 1.0",
  "Couleur d'accent": "Accent color",
  "Créer la page de garde": "Create the cover page",
  "Fusionnez ensuite la page de garde avec votre document grâce à l'outil « Fusionner des PDF ».":
    "Then merge the cover page with your document using the “Merge PDFs” tool.",

  // --- File kind detection (lib/files/detect.ts)
  "Document PDF": "PDF document",
  Image: "Image",
  "Photo HEIC / HEIF": "HEIC / HEIF photo",
  "Document Word (.docx)": "Word document (.docx)",
  "Classeur Excel (.xlsx)": "Excel workbook (.xlsx)",
  "Présentation PowerPoint (.pptx)": "PowerPoint presentation (.pptx)",
  "Fichier CSV": "CSV file",
  "Fichier texte": "Text file",
  "Archive ZIP": "ZIP archive",
  "Type non reconnu": "Unrecognized type",
  "Les présentations PowerPoint ne sont pas prises en charge : exportez-la en PDF depuis PowerPoint ou LibreOffice, puis utilisez les outils PDF.":
    "PowerPoint presentations are not supported: export it as PDF from PowerPoint or LibreOffice, then use the PDF tools.",
  "Les archives ne sont pas traitées : extrayez les fichiers puis déposez-les un par un.":
    "Archives are not processed: extract the files and drop them one at a time.",
  "Ce type de fichier n'est pas reconnu. Les outils acceptent les PDF, les images (PNG, JPEG, WebP, HEIC), les documents Word, Excel, CSV, Markdown et texte.":
    "This file type is not recognized. The tools accept PDFs, images (PNG, JPEG, WebP, HEIC), Word, Excel, CSV, Markdown and text documents.",
  "Les photos HEIC sont converties en JPEG ou PNG par l'outil « Convertir une image » (navigateurs récents ; décodeur libheif chargé à la demande).":
    "HEIC photos are converted to JPEG or PNG by the “Convert an image” tool (recent browsers; the libheif decoder is loaded on demand).",
};
