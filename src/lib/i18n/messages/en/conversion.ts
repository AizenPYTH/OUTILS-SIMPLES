/** French source string → English text (see src/lib/i18n/messages.ts). Office conversions. */
export const conversionEn: Record<string, string> = {
  // --- Word / Excel / CSV to PDF (components/conversion/office-to-pdf-tool.tsx)
  "Seuls les fichiers Word .docx sont acceptés (enregistrez les .doc au format .docx).":
    "Only Word .docx files are accepted (save .doc files as .docx).",
  "Seuls les classeurs .xlsx et les fichiers .csv sont acceptés (enregistrez les .xls au format .xlsx).":
    "Only .xlsx workbooks and .csv files are accepted (save .xls files as .xlsx).",
  "Fichier trop volumineux (maximum {max}).": "File too large (maximum {max}).",
  "Lecture du fichier…": "Reading the file…",
  "Mise en page du PDF…": "Laying out the PDF…",
  "{n} image": "{n} image",
  "{n} images": "{n} images",
  "Conversion simplifiée : à vérifier": "Simplified conversion: please check",
  "Changer les options": "Change the options",
  "Déposez votre document Word (.docx)": "Drop your Word document (.docx)",
  "Déposez un classeur Excel (.xlsx) ou un fichier CSV":
    "Drop an Excel workbook (.xlsx) or a CSV file",
  "{format} · {size} max": "{format} · {size} max",
  "Format .docx": ".docx format",
  "Formats .xlsx et .csv": ".xlsx and .csv formats",
  "Choisir un fichier": "Choose a file",
  "Changer de fichier": "Change file",
  "Titre (facultatif, en tête du PDF)": "Title (optional, at the top of the PDF)",
  "Laisser vide pour garder le titre du document": "Leave empty to keep the document title",
  "Nom du relevé, du rapport…": "Name of the statement, report…",
  "Taille du texte (pt)": "Text size (pt)",
  Paysage: "Landscape",
  "La première ligne est un en-tête": "The first row is a header",

  // --- PDF to Word (components/conversion/pdf-to-docx-tool.tsx)
  "Page {n} sur {total}": "Page {n} of {total}",
  "Votre document Word est prêt": "Your Word document is ready",
  "{n} paragraphe": "{n} paragraph",
  "{n} paragraphes": "{n} paragraphs",
  "Télécharger le .docx": "Download the .docx",
  "le texte devient des paragraphes modifiables ; la mise en page exacte n'est pas reproduite.":
    "the text becomes editable paragraphs; the exact layout is not reproduced.",
  "Une page Word par page du PDF": "One Word page per PDF page",
  "Reprendre les images": "Include the images",
  "Créer le document Word": "Create the Word document",

  // --- lib/conversion/docx.ts
  "Ce fichier n'est pas un document Word (.docx). Les anciens .doc ne sont pas pris en charge : enregistrez-le au format .docx depuis Word ou LibreOffice.":
    "This file is not a Word document (.docx). Old .doc files are not supported: save it as .docx from Word or LibreOffice.",
  "Impossible de lire ce document Word : le fichier est peut-être endommagé ou protégé par un mot de passe.":
    "This Word document could not be read: the file may be damaged or password-protected.",
  "Les en-têtes et pieds de page ne sont pas convertis.": "Headers and footers are not converted.",
  "Certains styles de paragraphe inconnus ont été rendus comme du texte normal.":
    "Some unknown paragraph styles were rendered as normal text.",
  "Certains styles de caractère inconnus ont été ignorés.":
    "Some unknown character styles were ignored.",
  "Une image n'a pas pu être lue et a été ignorée.": "An image could not be read and was ignored.",
  "Les notes de bas de page ont été simplifiées.": "Footnotes were simplified.",
  "Un élément non pris en charge a été ignoré.": "An unsupported element was ignored.",
  "Ce document Word ne contient aucun texte convertible (document vide ou composé uniquement d'images non prises en charge).":
    "This Word document contains no convertible text (empty document, or only unsupported images).",
  "Certains caractères (emoji, alphabets non latins, symboles) ont été remplacés par « ? ».":
    "Some characters (emoji, non-Latin alphabets, symbols) were replaced with “?”.",

  // --- lib/conversion/html-to-markdown.ts
  "Une image dans un format non pris en charge (EMF, WMF, GIF, TIFF…) a été ignorée.":
    "An image in an unsupported format (EMF, WMF, GIF, TIFF…) was ignored.",
  "Une image liée (non incorporée) a été ignorée.": "A linked (not embedded) image was ignored.",

  // --- lib/conversion/pdf-to-docx.ts
  "Certaines images (CCITT, JBIG2) n'ont pas pu être extraites.":
    "Some images (CCITT, JBIG2) could not be extracted.",
  "Les images n'ont pas pu être extraites ; seul le texte a été converti.":
    "The images could not be extracted; only the text was converted.",
  "Une image JPEG 2000 n'est pas prise en charge par Word et a été ignorée.":
    "A JPEG 2000 image is not supported by Word and was ignored.",
  "Aucun texte ni image exploitable dans ce PDF. S'il s'agit d'un scan, passez d'abord par la reconnaissance de texte (OCR).":
    "No usable text or image in this PDF. If it is a scan, run text recognition (OCR) first.",
  "Ce PDF ne contient pas de couche texte (scan) : seules les images ont été reprises. Utilisez l'OCR pour obtenir un texte modifiable.":
    "This PDF has no text layer (scan): only the images were included. Use OCR to get editable text.",
  "{n} page sans texte (scan) : image reprise, texte absent.":
    "{n} page without text (scan): image included, text missing.",
  "{n} pages sans texte (scan) : image reprise, texte absent.":
    "{n} pages without text (scan): image included, text missing.",

  // --- lib/conversion/sheet.ts
  "Ce fichier n'est pas un classeur Excel (.xlsx). Les anciens .xls ne sont pas pris en charge : enregistrez-le au format .xlsx, ou exportez-le en CSV.":
    "This file is not an Excel workbook (.xlsx). Old .xls files are not supported: save it as .xlsx, or export it as CSV.",
  "Impossible de lire ce classeur : le fichier est peut-être endommagé ou protégé par un mot de passe.":
    "This workbook could not be read: the file may be damaged or password-protected.",
  "Feuille « {name} » vide : ignorée.": "Sheet “{name}” is empty: ignored.",
  "Feuille « {name} » : seules les {max} premières lignes sont converties.":
    "Sheet “{name}”: only the first {max} rows are converted.",
  "Feuille « {name} » : les images et graphiques ne sont pas convertis.":
    "Sheet “{name}”: images and charts are not converted.",
  "Ce classeur ne contient aucune donnée convertible.":
    "This workbook contains no convertible data.",
  Données: "Data",
  "Ce fichier CSV est vide.": "This CSV file is empty.",
  "{n} colonnes : les colonnes sont étroites, préférez le format paysage ou scindez la feuille.":
    "{n} columns: the columns are narrow, prefer landscape or split the sheet.",
};
