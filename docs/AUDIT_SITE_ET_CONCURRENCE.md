# OUTILIA — Audit complet du site et analyse concurrentielle (26 octobre 2026)

> **Suites données** : les actions menées à partir de cet audit (mise en ligne, hors ligne, conversions Office, accueil, compléments, contenu) et ce qui reste à faire sont consignés dans `docs/RAPPORT_AUDIT_ACTIONS.md`.

Ce document dit ce qui existe (mesuré), ce que font les concurrents (sources citées), ce qui
manque, ce qu'il faut changer et ce qu'il faut ajouter, avec un ordre de priorité et une
estimation de faisabilité **sans API payante ni serveur de traitement** (contrainte du produit).

## 0. Méthode et limites de l'audit

- **Site** : état du dépôt au commit `af562bf` (branche `claude/festive-turing-f4fmzh`). Mesures
  faites sur la compilation de production servie localement, dans Chromium (desktop 1366 × 860 et
  Pixel 7 émulé) : registre des outils, poids transférés par page, délais de chargement,
  balises SEO, en-têtes de sécurité, manifeste PWA, sitemap, pages légales, captures.
  Lighthouse n'a pas pu être installé (installation refusée par l'environnement) : les scores
  Lighthouse ne sont donc **pas** fournis, seules les mesures brutes le sont.
- **Concurrents** : les sites des éditeurs (Smallpdf, iLovePDF, PDF24, Sejda, Adobe, PDFgear,
  Xodo, Foxit, Soda PDF, PDF Candy) sont **injoignables depuis l'environnement** (résolution DNS
  bloquée). Deux sources ont été utilisées, en le disant à chaque fois : (1) l'**audit
  documentaire fourni par le propriétaire du site** le 26 octobre 2026, fondé sur les pages
  officielles des dix éditeurs, et (2) des résumés de recherche web (Smallpdf « All tools »,
  iLovePDF, PDF24 « Tous les outils », Sejda, Adobe, comparatifs français 2026). Aucune interface
  concurrente n'a été manipulée ; « non confirmé » signifie non trouvé dans ces sources.
- **Non mesuré** : trafic réel, positions SEO, taux de conversion, Safari, Firefox, appareils
  physiques.

## 1. État des lieux mesuré

### 1.1 Catalogue : 66 outils publiés, 8 familles, tout en local

| Famille       | Outils | Contenu                                                                                                                                                                                                                                                                                                                                          |
| ------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PDF           |     27 | modifier (éditeur complet), fusionner, diviser, extraire pages, organiser, pivoter, recadrer, compresser, images ↔ PDF, texte, liens, images extraites, rechercher, comparer, caviarder, protéger, déverrouiller, vérifier/réparer, métadonnées, filigrane (ajout, gestion), numéroter, signer, annoter, ajouter du texte, remplir un formulaire |
| Numérisation  |      3 | scanner (caméra, redressement, filtres, PDF), OCR (fr/en, orientations mixtes, PDF recherchable), correction de perspective                                                                                                                                                                                                                      |
| Images        |      7 | compresser, convertir (JPG/PNG/WebP), recadrer, redimensionner, pivoter, filigrane, EXIF                                                                                                                                                                                                                                                         |
| Texte         |      5 | compteur, nettoyage, comparaison, casse, slug                                                                                                                                                                                                                                                                                                    |
| Développeur   |     10 | JSON, Base64, URL, HTML, hash, regex, UUID, mot de passe, timestamp, CSV → JSON                                                                                                                                                                                                                                                                  |
| Calculs       |      4 | TVA, pourcentage, dates, unités                                                                                                                                                                                                                                                                                                                  |
| QR & couleurs |      5 | QR (génération, lecture), codes-barres, couleurs/contraste, palette                                                                                                                                                                                                                                                                              |
| Documents     |      5 | Markdown → PDF, texte → PDF, page de garde, calendrier, feuilles à imprimer                                                                                                                                                                                                                                                                      |

Tous `published`, tous `processing: client`, aucun `premium`. 23 outils marqués « populaires ».
Profondeur éditoriale inégale : **35 outils sur 66 n'ont aucune FAQ** et la plupart ont 2 ou 3
limites listées ; 7 guides seulement.

### 1.2 Performance (production, Chromium, cache vide)

| Page                | HTML | JS transféré |  CSS | Polices | Total | Requêtes | DOMContentLoaded |
| ------------------- | ---: | -----------: | ---: | ------: | ----: | -------: | ---------------: |
| Accueil             | 24 K |        296 K | 16 K |   102 K | 524 K |       55 |           549 ms |
| /outils/            | 11 K |        290 K | 16 K |   101 K | 121 K |       63 |           203 ms |
| /pdf/fusionner/     | 17 K |        484 K | 16 K |   101 K |  86 K |       51 |            66 ms |
| /pdf/modifier/      | 20 K |        550 K | 16 K |   101 K | 340 K |       55 |            86 ms |
| /numerisation/ocr/  | 17 K |        505 K | 16 K |   101 K | 103 K |       53 |            83 ms |
| /images/compresser/ | 16 K |        316 K | 16 K |   101 K | 102 K |       50 |            94 ms |

Lecture : le socle JS commun est d'environ 290 Ko transférés (Next + React + interface) et les
pages PDF chargent 480–550 Ko avant tout fichier ; pdf.js (≈ 450 Ko), Tesseract (≈ 15 Mo de
moteur et modèles) et les polices de l'éditeur (jusqu'à 11,7 Mo) ne sont chargés qu'à l'usage.
Ces chiffres sont corrects pour un outil, mais pas excellents pour des pages d'atterrissage SEO :
une page « Fusionner des PDF » devrait pouvoir s'afficher avec moins de 150 Ko de JS avant
qu'un fichier soit déposé (voir § 4.3). 55 à 69 requêtes par page, c'est beaucoup (chunks
Turbopack) ; un visiteur sur réseau mobile le sent.

### 1.3 SEO et partage

- Points forts : titres et descriptions propres sur toutes les pages, canonical, `robots`
  `index,follow`, JSON-LD (fil d'Ariane, outil, FAQ) sur chaque outil, sitemap de 89 URL,
  routes statiques (SSG), `lang="fr"`, fil d'Ariane visible.
- Manques : **aucune image Open Graph / Twitter** (`twitter:card` = `summary`, pas d'`og:image`) :
  tout partage sur LinkedIn, X, WhatsApp, Slack affiche une carte sans visuel ; **pas de
  `hreflang`** ni de version anglaise ; 7 guides seulement ; pas de pages « X vs Y », pas de
  pages de conversion ciblant les requêtes les plus fortes du marché (« pdf en word », « jpg en
  pdf » existe, « word en pdf » non) ; `NEXT_PUBLIC_SITE_URL` à renseigner (actuellement
  `localhost` dans les balises).

### 1.4 Sécurité, vie privée, conformité

- CSP stricte (`default-src 'self'`, `wasm-unsafe-eval`, pas de domaine tiers), HSTS, `X-Frame-Options`,
  `Permissions-Policy`, `Referrer-Policy` : très bon, et cohérent avec la promesse « rien ne quitte
  votre navigateur ».
- Consentement intégré (`builtin`), analytics désactivée par défaut (`none`, Plausible ou GA
  possibles), publicité désactivée (`NEXT_PUBLIC_ADS_ENABLED=false`) : conforme RGPD par défaut.
- **Pages légales à compléter** : éditeur, adresse, directeur de publication, hébergeur, contact
  sont **vides** (`siteConfig.legal`) et s'affichent « à compléter ». Bloquant avant toute
  publication (LCEN : mentions obligatoires).
- Pas de page « Comment vérifier que rien n'est envoyé » (onglet Réseau) alors que c'est l'argument
  numéro un ; la FAQ d'accueil l'évoque en une phrase.

### 1.5 Technique et produit

- PWA : manifeste présent (installable), **aucun service worker** : pas de mode hors ligne, alors
  que l'architecture 100 % locale le permettrait et que c'est l'argument de PDF24 Creator, Sejda
  Desktop, PDF Candy Desktop… sans installer quoi que ce soit.
- Une seule langue (fr). Thème clair/sombre, recherche Ctrl + K, raccourcis clavier dans
  l'éditeur, accessibilité axe sans violation sérieuse sur les pages clés.
- Qualité : 197 tests unitaires, 110 parcours Playwright (desktop + mobile), typecheck/lint ;
  matrice des 66 outils avec limites écrites sur chaque page ; **pas de CI** (`.github/workflows`
  absent) : rien n'empêche une régression d'être poussée.
- Formats : PDF, PNG, JPEG, WebP (lecture : aussi GIF, BMP, AVIF, SVG). **Pas de HEIC/HEIF**
  (photos iPhone), pas de TIFF, **aucune conversion Office** (DOCX, XLSX, PPTX) ni PDF/A.
- Pas d'IA (résumé, discussion avec le document, traduction) : conforme à la contrainte « sans
  API payante », mais c'est aujourd'hui le premier argument marketing de Smallpdf, Adobe, Foxit,
  PDFgear.

### 1.6 Interface (captures de l'accueil, du catalogue, d'une page d'outil)

Hiérarchie claire (titre, promesse, recherche, populaires, familles, parcours, engagements,
guides, FAQ, pied de page), identité cohérente, page d'outil qui met la zone d'action en premier
puis le contenu SEO. Défauts observés : l'accueil est long (≈ 3 900 px) et répète trois fois la
même liste d'outils (populaires, familles, parcours) ; la carte « Scanner un document » n'annonce
pas que la caméra demande HTTPS ; aucune démonstration visuelle (capture ou animation de
l'éditeur) alors que c'est l'outil phare ; le bouton de langue dans l'en-tête ne mène à rien
d'utile tant qu'il n'y a qu'une langue.

## 2. Ce que font les concurrents (synthèse des sources)

Source principale : audit documentaire du 26 octobre 2026 fourni par le propriétaire (pages
officielles), complété par les résumés de recherche cités en annexe.

| Capacité                                     | Smallpdf                 | iLovePDF                  | PDF24                         | Adobe (web)                        | Sejda                        | PDFgear (web)         | Xodo / Foxit / Soda / Candy | **OUTILIA**                                                        |
| -------------------------------------------- | ------------------------ | ------------------------- | ----------------------------- | ---------------------------------- | ---------------------------- | --------------------- | --------------------------- | ------------------------------------------------------------------ |
| Modifier le texte existant                   | Pro                      | non confirmé              | non confirmé                  | selon offre                        | **oui**                      | bureau seulement      | oui (bureau / payant)       | **oui, gratuit, local** (police d'origine si possible)             |
| OCR intégré au parcours d'édition            | outil séparé             | outil séparé              | outil séparé                  | Pro                                | non                          | écosystème            | oui (bureau)                | **oui, dans l'éditeur**                                            |
| Conversions Office (Word, Excel, PPT)        | oui                      | oui                       | oui (+ HEIC, EPUB)            | oui                                | oui                          | oui                   | oui                         | **non**                                                            |
| PDF/A, réparation                            | —                        | oui                       | non confirmé / oui            | oui                                | —                            | —                     | oui                         | réparation oui, PDF/A **non**                                      |
| Comparer, caviarder, rechercher/remplacer    | oui / oui / —            | oui / oui / —             | oui / oui / recherche         | oui                                | oui / visuel / oui           | — / — / —             | oui                         | comparer (texte), caviarder (réel), rechercher/remplacer (éditeur) |
| Formulaires : remplir / **créer** des champs | oui / —                  | oui / —                   | oui / oui                     | oui / Pro                          | oui / oui                    | oui / oui             | oui / oui                   | remplir **oui**, créer **non**                                     |
| Traitement local / hors ligne                | non                      | non                       | app Windows                   | non                                | app bureau                   | **web local**         | apps bureau                 | **web local**, pas de hors-ligne                                   |
| Limites gratuites                            | ~2 tâches/jour (sources) | usages et tailles limités | aucune                        | 10 traitements / 7 jours (sources) | 3 tâches/h, 50 Mo, 200 pages | 100 Mo                | payant                      | 100 Mo, 1 000 pages, illimité                                      |
| Compte, publicité                            | compte pour Pro          | compte pour Premium       | pub                           | compte Adobe                       | compte Pro                   | sans compte, sans pub | compte                      | sans compte, pub désactivée                                        |
| IA (résumé, chat, traduction)                | oui                      | —                         | —                             | oui (quota)                        | non                          | oui (lecteur)         | Foxit oui                   | **non**                                                            |
| Intégrations Drive / Dropbox / OneDrive      | oui                      | oui                       | —                             | oui                                | oui                          | —                     | selon offre                 | **non**                                                            |
| Apps mobile / bureau, API                    | oui / oui / —            | oui / oui / API           | — / Windows / —               | oui                                | bureau                       | bureau                | bureau                      | **non** (PWA installable, pas hors ligne)                          |
| Lots (batch)                                 | selon offre              | selon offre               | Creator                       | selon offre                        | selon outil                  | selon app             | oui                         | images oui, **PDF non**                                            |
| Catalogue (outils)                           | 30–48                    | 25+                       | ~24 catégories, le plus large | 25+                                | ~30                          | ~15                   | larges                      | 66 (dont 39 hors PDF)                                              |
| Fidélité d'export documentée                 | —                        | —                         | —                             | oui                                | **oui** (limites écrites)    | —                     | —                           | **oui** (limites sur chaque page)                                  |

Lecture : OUTILIA est déjà au niveau ou devant sur **l'édition gratuite et locale** (texte natif,
OCR intégré, caviardage réel, export vérifié, limites honnêtes : seuls Sejda et Adobe sont aussi
explicites) et sur la **largeur hors PDF** (images, texte, développeur, calculs, documents). Il est
derrière sur trois terrains visibles de tous : **conversions Office**, **mode hors ligne /
applications**, **IA**. Et sur deux terrains silencieux mais décisifs : **notoriété / contenu**
(7 guides, une langue, pas de visuels de partage) et **preuves de confiance** (mentions légales
vides, pas de page « vérifiez-le vous-même », pas de code public).

## 3. Ce qui manque, par ordre de priorité

Critères : valeur pour l'utilisateur et le référencement, faisabilité **dans le navigateur sans
service externe**, licence, coût de maintenance, risque de décevoir.

### Priorité 1 — à faire avant toute mise en avant (semaines 1 à 4)

1. **Mentions légales, confidentialité, contact réels.** Remplir `siteConfig.legal`, l'adresse de
   contact, l'hébergeur ; relire la politique de confidentialité à la lumière des choix (analytics
   désactivée, pub désactivée). Sans cela, rien d'autre ne compte.
2. **Mode hors ligne (service worker).** L'argument « vos fichiers restent chez vous » devient
   démontrable : couper le Wi-Fi et fusionner un PDF. Faisable : `serwist`/`workbox` avec
   précache du socle et mise en cache à l'usage des gros actifs (pdf.js, OCR, polices). Risques :
   invalidation des caches à chaque mise à jour, taille (ne pas précacher Tesseract). C'est ce
   que PDF24, Sejda et PDF Candy vendent avec un logiciel à installer ; OUTILIA peut le faire sans
   installation.
3. **Conversions Office, direction Office → PDF d'abord.** Le trou fonctionnel le plus visible.
   - DOCX → PDF : `docx-to-pdf-wasm` (MIT, WebAssembly) ou `mammoth` (BSD, DOCX → HTML) +
     impression du HTML via le navigateur. Fidélité partielle (styles complexes, en-têtes de
     page) : l'annoncer comme pour les scans.
   - XLSX/CSV → PDF : SheetJS édition communautaire (Apache-2.0) + mise en page tabulaire avec
     pdf-lib (déjà fait pour Markdown).
   - PPTX → PDF : pas de bibliothèque libre fiable côté navigateur ; ne pas promettre.
   - PDF → DOCX : `@bentopdf/pymupdf-wasm` (pdf2docx) est **AGPL** : incompatible sauf à publier le
     site sous AGPL. Alternative honnête : « PDF → Word (texte et images, mise en page
     approximative) » avec la bibliothèque `docx` (MIT) à partir des positions extraites par pdf.js.
     Afficher la limite en gros.
   - HTML → PDF : `window.print()` vers PDF n'est pas une conversion ; une vraie mise en page
     demanderait un moteur. Reporter.
4. **HEIC/HEIF** (photos iPhone) dans les outils images, le scanner et images → PDF :
   `libheif-js` (LGPL-3, utilisable sans contaminer le code si chargé comme module séparé) ou
   `heic-to`. Vérifier la licence avant d'intégrer.
5. **Images Open Graph** (une image générée par outil avec le nom et la famille, `opengraph-image`
   de Next) et `NEXT_PUBLIC_SITE_URL` de production.
6. **Intégration continue** : GitHub Actions qui exécute typecheck, lint, Vitest, build et
   Playwright sur chaque poussée. Les suites existent ; il manque l'automate.

### Priorité 2 — compléter la suite PDF là où le coût est faible (semaines 4 à 10)

7. **Créer des champs de formulaire** (texte, case à cocher, liste, signature) dans l'éditeur :
   pdf-lib sait créer des AcroForms ; Sejda, PDF24, PDFgear le proposent. Valeur forte pour les
   indépendants (devis, bulletins).
8. **Aplatir** (formulaires + annotations) en outil autonome, **supprimer des pages** et
   **insérer des pages d'un autre PDF** directement dans l'éditeur (le plan de pages existe ;
   rendre le plan multi-sources ou offrir « Ajouter un PDF » qui fusionne à la volée).
9. **En-têtes / pieds de page et numérotation Bates** (texte libre, date, nom du fichier) : la
   numérotation existe ; l'étendre coûte peu.
10. **Lots pour les PDF** : compresser, convertir en images, protéger, numéroter plusieurs fichiers
    d'un coup avec une file de traitement et un ZIP (le ZIP existe déjà pour les images).
11. **PDF en niveaux de gris / inverser les couleurs** : version pixellisée seulement (pdf-lib ne
    recolore pas un flux) ; à proposer avec l'avertissement « texte non sélectionnable », ou ne
    pas proposer.
12. **Comparaison visuelle** (superposition de pages pixellisées, différences en rouge) en
    complément de la comparaison de texte existante.
13. **Signets / table des matières** à la fusion (Sejda le fait) et édition des signets.
14. **Images** : suppression d'arrière-plan et agrandissement par IA locale. Modèles ONNX dans le
    navigateur (`onnxruntime-web`, modèles U²-Net ou ISNet ≈ 40–170 Mo) : faisable, lourd, et les
    bibliothèques prêtes à l'emploi (`@imgly/background-removal`) sont **AGPL**. À prototyper avec
    un modèle sous licence permissive avant de promettre.

### Priorité 3 — croissance (continu)

15. **Contenu** : passer de 7 à 40 guides (un par outil phare + « comment vérifier qu'un site
    n'envoie pas vos fichiers », « PDF scanné ou natif ? », « signature électronique : ce qui est
    valable »), FAQ sur les 35 outils qui n'en ont pas, pages comparatives honnêtes (« OUTILIA ou
    iLovePDF pour fusionner ? » avec la différence réelle : local vs envoi), pages par cas d'usage
    (« alléger une pièce jointe pour un mail », « préparer un dossier de location »).
16. **Version anglaise** : la couche i18n existe (`fr.ts` seul) ; les textes du registre (66 × 10
    champs) sont le vrai travail. Le marché anglophone est dix fois plus grand ; la promesse
    « local-first » y a une demande identifiée (voir les sources sur les outils « no upload »).
17. **Preuves de confiance** : page « Vérifiez-le » (capture de l'onglet Réseau, lien vers les
    bibliothèques), **code public** du dépôt (différenciateur immédiat face à PDFgear qui dit
    « local » sans preuve), badge « aucune requête pendant le traitement » vérifié par un test
    automatique et affiché.
18. **IA sans API payante** : trois options honnêtes. (a) Rien, et le dire (« pas d'IA, pas d'envoi
    de vos documents ») — défendable. (b) Résumé local par un petit modèle (`transformers.js`,
    quelques centaines de Mo, lent sur mobile) — coûteux pour un gain incertain. (c) « Apportez
    votre clé » (OpenAI, Mistral) avec consentement explicite par document : le site n'engage pas
    de frais, l'utilisateur choisit. Recommandation : (a) maintenant, (c) plus tard, (b) jamais
    sans mesures.
19. **Import depuis Drive / Dropbox** : possible côté navigateur (sélecteurs officiels) mais
    contredit la promesse et demande des clés d'API ; ne pas faire avant d'avoir la demande.

## 4. Ce qu'il faut changer

### 4.1 Positionnement et page d'accueil

- Dire la différence en une ligne vérifiable : « Fusionner, signer, modifier un PDF sans jamais
  l'envoyer : tout se passe dans votre navigateur, et vous pouvez le vérifier. » Aujourd'hui la
  promesse est là, la preuve n'est pas à un clic.
- Réduire l'accueil : populaires + familles + preuve de confiance + guides suffisent ; la section
  « Que voulez-vous faire ? » redit les familles. Ajouter une **démonstration de l'éditeur**
  (capture animée de 10 s : déposer, modifier un mot, exporter).
- **Déposer un fichier sur l'accueil** : détecter le type (PDF natif, scan, image, HEIC, DOCX) et
  proposer les outils pertinents. C'est le geste le plus naturel et personne ne le fait bien.
- Retirer ou brancher le bouton de langue tant qu'une seule langue existe.

### 4.2 Pages d'outil et parcours

- Enchaînement entre outils sans retélécharger (« Continuer dans l'éditeur » existe pour
  certains ; généraliser : compresser → protéger → télécharger, fusionner → numéroter).
- Historique local optionnel des fichiers récents (IndexedDB, sur l'appareil, effaçable) pour
  reprendre un travail ; à présenter comme « sur cet appareil uniquement ».
- Résultats : montrer avant/après systématiquement (taille, pages, aperçu), comme pour la
  compression ; proposer « Ouvrir dans un autre outil ».
- Messages d'erreur : déjà explicites ; ajouter sur chaque page le lien « Pourquoi mon fichier
  est-il refusé ? » vers un guide unique.

### 4.3 Technique

- Alléger les pages d'atterrissage : charger pdf.js et l'interface de traitement **après** le
  dépôt du fichier (import dynamique du composant d'outil), viser < 150 Ko de JS au premier
  affichage ; regrouper les chunks (55–69 requêtes aujourd'hui).
- Service worker (§ 3.2), images OG (§ 3.5), CI (§ 3.6).
- Lancer Lighthouse et Web Vitals en vrai (navigateur de bureau avec réseau simulé) : non fait ici.
- Vérifier Safari et Firefox sur les dix parcours clés ; publier la liste des navigateurs
  pris en charge.

### 4.4 Modèle économique

Le traitement local rend le coût marginal quasi nul : pas de serveurs de conversion, pas de
stockage. Trois pistes compatibles avec la promesse : publicité contextuelle légère (déjà
prévue, désactivée) comme PDF24 ; un palier **« Soutenir / Pro »** sans fonctionnalité bridée
mais avec confort (sans pub, lots illimités, thèmes, application de bureau empaquetée) ; dons.
À éviter : brider les fonctions de base derrière un compte (c'est précisément ce que les
utilisateurs fuient chez Smallpdf et Sejda).

## 5. Ce qu'il ne faut pas faire

- Ne pas annoncer PDF → Word « parfait », PPTX → PDF, PDF/A ou l'IA sans moteur crédible dans
  le navigateur : la crédibilité du site repose sur des limites écrites et tenues.
- Ne pas copier le ruban dense de Foxit ni multiplier les boutons ; l'éditeur vient d'être
  réorganisé par intention, garder cette ligne.
- Ne pas ajouter d'outils « décoratifs » (compteur de caractères n°2, convertisseur exotique) :
  chaque nouvel outil doit passer la matrice de vérification existante.
- Ne pas introduire de traitement serveur « pour aller plus vite » : c'est le seul avantage
  structurel du site.

## 6. Feuille de route proposée

| Horizon              | Contenu                                                                                                                                                             | Effort estimé |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 0–4 semaines         | Légal complet, URL de production, images OG, CI, service worker hors ligne, HEIC, dépôt de fichier sur l'accueil avec détection                                     | 3–4 semaines  |
| 1–3 mois             | DOCX → PDF et XLSX → PDF, PDF → Word « texte et images » (limites affichées), champs de formulaire, aplatir, insérer des pages, lots PDF, en-têtes/pieds, 20 guides | 6–8 semaines  |
| 3–6 mois             | Version anglaise, comparaison visuelle, signets, suppression d'arrière-plan (si licence permissive validée), pages comparatives, page « Vérifiez-le » + code public | 6–10 semaines |
| Plus tard, à décider | IA « apportez votre clé », import Drive/Dropbox, application de bureau empaquetée                                                                                   | selon demande |

## 7. Ce qui reste à valider par une personne

- Les limites gratuites et les catalogues des concurrents cités : vérifier sur les sites
  officiels (inaccessibles ici) avant d'écrire une page comparative.
- Les volumes de recherche en France (« pdf en word », « word en pdf », « compresser pdf ») :
  non obtenus ici ; à relever dans Google Keyword Planner ou Semrush avant de prioriser les
  conversions Office par rapport à l'anglais.
- Safari, Firefox, téléphones réels, Lighthouse.

## Annexe — sources de recherche web (résumés de moteur, non consultées directement)

- Comparatifs français 2026 : [La Fabrique du Net — alternatives à iLovePDF](https://www.lafabriquedunet.fr/logiciels/alternatives/alternative-ilovepdf), [alternatives à Sejda](https://www.lafabriquedunet.fr/logiciels/alternatives/alternative-sejda), [alternatives à PDF24](https://www.lafabriquedunet.fr/logiciels/alternatives/alternative-pdf24-tools), [Konomic — éditeurs PDF gratuits 2026](https://konomic.io/blog/fr-meilleurs-editeurs-pdf-gratuits-2026), [1001web — compresser un PDF 2026](https://www.1001web.fr/compresser-pdf-en-ligne-2026-5-outils-gratuits-162771.html).
- Catalogues officiels (via résumés) : [Smallpdf — All tools](https://smallpdf.com/pdf-tools), [iLovePDF](https://www.ilovepdf.com/fr), [iLovePDF — prix](https://www.ilovepdf.com/fr/prix), [PDF24 — tous les outils](https://tools.pdf24.org/fr/tous-les-outils), [Sejda](https://www.sejda.com/), [Sejda — en-têtes et pieds de page](https://www.sejda.com/header-footer-pdf), [Adobe — fonctionnalités](https://www.adobe.com/acrobat/features.html), [Adobe — limites de l'assistant IA](https://helpx.adobe.com/vn_en/acrobat/desktop/use-acrobat-ai/understand-usage-policies/ai-usage-policy-limitations.html).
- Outils locaux « sans envoi » : [guide vie privée 2026](https://blog.ailovekit.com/best-free-pdf-tools-privacy-guide/), [tinypdftools — pourquoi le local](https://tinypdftools.com/blog/why-client-side-pdf-tools-are-safer), [justpdf — rapport vie privée 2026](https://justpdf.app/pdf-privacy-report-2026), [Stirling-PDF (auto-hébergé)](https://blog.elest.io/self-host-stirling-pdf-50-private-pdf-tools-on-your-server/).
- Conversions dans le navigateur : [docx-to-pdf-wasm (MIT)](https://cdn.jsdelivr.net/npm/docx-to-pdf-wasm@0.1.0/README.md), [@bentopdf/pymupdf-wasm (AGPL)](https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@0.11.16/README.md), [office2pdf (Rust, Apache-2.0)](https://docs.rs/crate/office2pdf/latest), [Nutrient (commercial)](https://www.nutrient.io/sdk/pdf-to-office-conversion/).
- Images : [outils image gratuits 2026](https://www.codaone.ai/blog/best-free-image-tools-2026/), [Photopea — offre gratuite](https://www.costbench.com/software/design/photopea/free-plan/), [PDFgear vs Sejda](https://toolradar.com/compare/pdfgear-vs-sejda), [éditeurs PDF gratuits 2026](https://softpicker.com/best-free-pdf-editors/).
