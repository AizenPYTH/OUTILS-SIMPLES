# Étude : champs de formulaire, PowerPoint → PDF, PDF/A, stockage en nuage, IA

Date : 2026-10-27. Objet : décider, pour chaque fonctionnalité demandée en phase 9 de la mission de
finalisation, si elle peut être livrée de façon fiable dans le navigateur sans contredire la promesse
du site. Règle appliquée : **rien n'est ajouté si la fidélité ou la confidentialité ne peut pas être
garantie** ; dans ce cas la spécification est écrite pour une itération ultérieure.

## 1. Création de champs de formulaire dans le modificateur

### État actuel

- `pdf-fill-form` remplit les formulaires **existants** (AcroForm) : champs texte, cases, boutons radio,
  listes ; aplatissement optionnel ; XFA non pris en charge (`src/lib/pdf/operations/forms.ts`).
- Le modificateur ajoute des objets visuels (texte, formes, images, signature) mais ne crée pas de champ
  interactif.

### Faisabilité technique (vérifiée dans le code et l'API de pdf-lib 1.17)

- pdf-lib sait créer des champs (`form.createTextField`, `createCheckBox`, `createRadioGroup`,
  `createDropdown`, `createOptionList`) et les placer sur une page (`field.addToPage(page, {x, y, width,
height, font, …})`). Les apparences sont générées par pdf-lib avec une police standard ou incorporée.
- Points fiables : champ texte simple, case à cocher, groupe radio, liste déroulante, nommage unique,
  police Helvetica/Liberation déjà incorporée par l'éditeur, export via le pipeline existant
  (`page-plan` + vérification du fichier produit).
- Points non fiables ou coûteux : champs multilignes avec retour automatique dans tous les lecteurs
  (Aperçu macOS et certains lecteurs mobiles régénèrent l'apparence différemment), champs de signature
  numériques (hors périmètre : pas de certificat), calculs/JavaScript de formulaire (jamais), fusion avec
  un formulaire existant portant des noms de champs en conflit (déjà signalé pour `pdf-merge`).

### Décision

**Non implémenté dans cette itération** : la fonctionnalité est faisable mais exige une interface
spécifique (propriétés de champ : nom, valeur par défaut, obligatoire, options de liste, ordre de
tabulation) et une campagne de test sur plusieurs lecteurs (Acrobat Reader, Aperçu, Chrome, Firefox,
iOS) que cette session ne peut pas réaliser. L'ajouter sans cette validation contredirait la règle
« ne publie pas un outil tant qu'il ne fonctionne pas vraiment ».

### Spécification pour l'itération suivante

1. Nouvel intent « Formulaire » dans la barre d'outils du modificateur : champ texte, case, radio, liste.
2. Objet d'édition `form-field` (type, nom unique généré `champ-1`, étiquette, valeur par défaut,
   obligatoire, options) stocké dans le même historique annuler/rétablir que les autres objets.
3. Export : création des champs via pdf-lib après l'aplatissement des objets visuels ; police Liberation
   Sans incorporée ; `NeedAppearances` laissé à faux (apparences générées) ; vérification à l'export que
   `getForm().getFields().length` correspond au nombre d'objets.
4. Tests unitaires : création/relecture par pdf.js (`getAnnotations` type `Widget`), valeurs par défaut,
   noms uniques, conflit avec un formulaire existant (renommage automatique `-2`).
5. Tests Playwright : création d'un champ au clavier et à la souris, remplissage dans `pdf-fill-form` du
   fichier produit (aller-retour), accessibilité des propriétés.
6. Validation manuelle sur lecteurs réels avant publication (procédure `docs/VALIDATION_APPAREIL_REEL.md`).

## 2. PowerPoint → PDF et PDF/A

- **PowerPoint → PDF** : aucun moteur de rendu de diapositives fiable n'existe dans le navigateur (mise en
  page, polices, SmartArt, animations figées). Les bibliothèques JavaScript disponibles extraient le texte
  ou génèrent des PPTX, mais ne rendent pas fidèlement. Un rendu approximatif serait présenté comme une
  conversion : refusé. L'accueil l'explique quand un `.pptx` est déposé et propose l'export PDF depuis
  PowerPoint/LibreOffice.
- **PDF/A** : la conformité exige l'incorporation de toutes les polices, un profil ICC de sortie, des
  métadonnées XMP conformes et l'absence de chiffrement/JavaScript/transparence non autorisée, puis une
  **validation** (veraPDF) qu'aucun outil navigateur ne fournit. Produire un fichier « PDF/A » sans
  validation serait une promesse non tenue : refusé. Alternative documentée : exporter depuis LibreOffice
  (PDF/A-1b/2b) ou utiliser un service spécialisé, hors du site.

## 3. Google Drive, Dropbox, OneDrive

Documenté, non construit. Une intégration impliquerait : OAuth côté client (identifiants d'application à
créer chez chaque fournisseur, écrans de consentement, vérification de l'application par Google pour les
scopes Drive), un hôte tiers dans `connect-src`/`script-src` du CSP, et un flux de fichiers qui, même
s'il reste navigateur ↔ fournisseur, affaiblit la lisibilité de la promesse « rien n'est envoyé ».
Conditions pour l'envisager : décision produit, comptes développeur, mention explicite sur la page de
l'outil (« ce fichier est téléchargé depuis votre Drive, puis traité localement ») et mise à jour de la
politique de confidentialité. Aucune de ces conditions n'est remplie aujourd'hui.

## 4. Fonctions « IA » (résumé, chat avec le PDF)

Non construit. Une IA distante enverrait le contenu des documents à un tiers : contradiction directe avec
la promesse du site. Une IA locale (modèle dans le navigateur) pèse plusieurs centaines de Mo et reste
lente sur mobile. Si un jour une telle fonction est voulue, elle devra être un outil distinct, clairement
marqué « traité hors de votre navigateur » ou « modèle local de N Mo », avec consentement explicite par
fichier. Décision : hors périmètre tant que la stratégie produit n'a pas tranché.
