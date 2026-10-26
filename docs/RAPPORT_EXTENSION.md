# Rapport — Extension majeure du catalogue OUTILIA

Branche : `claude/festive-turing-f4fmzh`. Commits de l'extension : `fa9916b` (lot 1), `8795989` (lot 2),
`a806b09` (lot 3), puis le commit de documentation qui accompagne ce rapport.

Le catalogue passe de **13 à 66 outils publiés**, répartis dans 8 catégories actives (la catégorie
« Conversion de fichiers » existe dans le code mais ne contient pas d'outil propre : elle n'est ni affichée ni
indexée). Tous les traitements restent dans le navigateur ; aucun endpoint serveur n'a été ajouté.

## 1. Outils existants conservés (13)

Aucun n'a été réécrit ; ils ont été déplacés dans `src/lib/tools/registry/pdf-core.ts` sans changement de
route ni de comportement. Le rendu des outils (`tool-renderer.tsx`) est passé en client uniquement
(`ssr: false`) pour éviter la perte de saisie avant hydratation.

Modifier (éditeur), Fusionner, Diviser, Compresser, Organiser, Pivoter, Extraire des pages, Ajouter du
texte, Annoter, Signer, Ajouter un filigrane, Gérer le filigrane, Remplir un formulaire.

## 2. Nouveaux outils implémentés et testés (53)

Chaque outil a sa route, ses métadonnées SEO, ses étapes, ses limites, sa FAQ, son entrée dans le sitemap,
une couverture unitaire de sa bibliothèque et au moins un parcours Playwright.

**PDF (14)** — Extraire le texte · Rechercher dans un PDF · PDF vers images · Images vers PDF · Recadrer
les pages · Numéroter les pages / en-têtes · Protéger par mot de passe (qpdf WebAssembly, AES-256) ·
Déverrouiller · Vérifier / réparer · Métadonnées (lecture, édition, suppression) · Extraire les liens ·
Extraire les images (sans recompression) · Comparer deux PDF · Caviarder (suppression réelle par
rastérisation des pages marquées, recherche de texte + rectangles dessinés).

**Numérisation (3)** — Scanner un document (caméra mobile, recadrage, filtres, réorganisation, export
PDF/JPG/PNG) · Corriger un document photographié (détection des coins, 4 poignées, homographie) · OCR
(Tesseract 5 LSTM, français/anglais, TXT/Markdown/PDF recherchable).

**Images (7)** — Compresser · Redimensionner · Recadrer · Convertir (JPG/PNG/WebP) · Pivoter / retourner ·
Métadonnées EXIF (lecture et suppression sans perte pour JPEG/PNG) · Filigrane texte, tous par lot
jusqu'à 50 fichiers avec ZIP.

**Texte (5)** — Compteur de mots · Majuscules / minuscules · Nettoyer un texte · Comparer deux textes ·
Générateur de slug.

**Développeur (10)** — JSON (formater, valider avec ligne/colonne, minifier, CSV) · CSV vers JSON · Base64
(texte, fichier → Data URI) · URL · Entités HTML · UUID · Mots de passe · Hash SHA-1/256/384/512 · Testeur
de regex · Timestamp Unix.

**Calculatrices (4)** — Pourcentages · TVA · Jours entre deux dates et jours ouvrés (fériés français,
Alsace-Moselle) · Convertisseur d'unités (9 grandeurs).

**Codes et couleurs (5)** — Générateur de QR code (URL, texte, Wi-Fi, vCard ; PNG/SVG) · Lecteur de QR
code (image ou caméra) · Codes-barres EAN-13 / EAN-8 / UPC-A / Code 128 / Code 39 (encodeur maison,
PNG/SVG) · Convertisseur de couleurs + contraste WCAG · Palette d'une image.

**Documents (5)** — Markdown vers PDF · Texte vers PDF · Feuilles à imprimer (quadrillé, ligné, pointillé,
Seyès, millimétré, isométrique, musique) · Calendrier mensuel / annuel · Page de garde.

## 3. Fonctionnalités non terminées ou volontairement écartées

- **Conversion de fichiers** : pas de DOCX/XLSX/PPTX ↔ PDF. Un rendu fidèle d'Office dans le navigateur
  exige soit un moteur serveur (LibreOffice), soit une bibliothèque lourde et approximative ; écarté pour
  rester honnête et sans serveur. La catégorie reste masquée tant qu'elle est vide.
- **HEIC/HEIF** (photos iPhone) : non décodable par les navigateurs ; documenté sur chaque outil image.
- **Filigrane image** (logo) sur les images : seul le filigrane texte est fourni.
- **Comparaison visuelle de PDF** (pixels) : seule la comparaison du texte est implémentée.
- **Extraction d'images CCITT / JBIG2** : signalée comme « non extraite » avec renvoi vers « PDF vers
  images ».
- **Polices Unicode dans les PDF générés** : polices standard uniquement (emoji, cyrillique, arabe… remplacés
  par « ? » et signalés). L'intégration de polices (fontkit) reste l'évolution naturelle.
- **Web Worker pour pdf-lib** : les opérations lourdes tournent sur le thread principal avec rendez-vous ;
  pas bloquant pour les tailles autorisées, mais prévu.
- **Capture caméra en continu** pour le lecteur de QR code : lecture d'une photo prise, pas de flux vidéo
  analysé image par image.

## 4. Vérifications réellement exécutées (dernier passage complet)

| Commande         | Résultat                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | 0 erreur (`next typegen` + `tsc --noEmit`, TypeScript strict)                                                                       |
| `pnpm lint`      | 0 erreur, 0 avertissement                                                                                                           |
| `pnpm test`      | 121 tests Vitest, 13 fichiers, tous verts                                                                                           |
| `pnpm build`     | 96 pages statiques générées                                                                                                         |
| `pnpm test:e2e`  | 56 parcours Playwright × 2 projets (desktop, mobile Pixel 7) : tous verts, 4 ignorés volontairement sur mobile (raccourcis clavier) |

Les parcours e2e vérifient les fichiers téléchargés (pdf-lib, pdf.js : nombre de pages, texte présent ou
absent, métadonnées supprimées, archives ZIP), pas seulement l'interface. L'OCR est testé sur une image
de texte français réelle (fixture générée) et le caviardage vérifie que le texte a disparu du PDF produit.

Deux problèmes d'infrastructure de test ont été corrigés au passage : un serveur `next start` orphelin
servait un build périmé entre deux exécutions (Playwright lance désormais le binaire Next directement et
refuse de réutiliser un serveur existant), et un débordement horizontal sur mobile élargissait la fenêtre
de rendu de Chrome et faisait échouer les clics (corrigé dans le catalogue, l'en-tête et le caviardage,
avec un test de balayage mobile pour éviter la régression).

## 5. Bibliothèques ajoutées, licences et raisons

| Bibliothèque                         | Licence                 | Raison                                                                              |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------- |
| tesseract.js 7 + tesseract.js-core 7 | Apache-2.0              | OCR dans le navigateur (WebAssembly), seule option open source mature côté client   |
| @tesseract.js-data/fra, /eng         | Apache-2.0              | Modèles de langue auto-hébergés (aucun téléchargement depuis un CDN tiers)          |
| @neslinesli93/qpdf-wasm              | ISC (qpdf : Apache-2.0) | Chiffrement AES-256, déverrouillage et vérification de PDF ; pdf-lib ne chiffre pas |
| qrcode                               | MIT                     | Génération de QR codes (PNG, SVG)                                                   |
| jsqr                                 | Apache-2.0              | Décodage de QR codes à partir de pixels                                             |
| diff                                 | BSD-3-Clause            | Algorithme de Myers pour les comparaisons de textes et de PDF                       |
| exifr                                | MIT                     | Lecture EXIF/XMP/IPTC rapide ; la suppression est réalisée par notre propre code    |
| marked                               | MIT                     | Analyse Markdown (jetons) pour la mise en page PDF et l'aperçu                      |
| dompurify                            | MPL-2.0 / Apache-2.0    | Assainissement de l'aperçu HTML du Markdown                                         |
| @types/qrcode (dev)                  | MIT                     | Typages                                                                             |

Écrit sans dépendance : encodeur PNG, encodeurs de codes-barres, homographie et détection de coins,
filtres d'image (Otsu, document, palette), extraction d'images PDF, mise en page Markdown → PDF,
calendriers et feuilles, calculs de dates et de TVA, conversions de couleurs et d'unités.

Poids servis (dossier `public/`, copié au `postinstall`) : pdf.js 5,2 Mo ; Tesseract 3 variantes de
moteur autonome `*.wasm.js` (≈ 3,9 Mo chacune, une seule est téléchargée par l'utilisateur selon son
processeur ; les fichiers `.js`/`.wasm` séparés, jamais chargés, ne sont plus copiés depuis l'audit) ;
modèles fra 6,3 Mo et eng 10,9 Mo compressés ; qpdf 1,3 Mo. Tout est chargé
à la demande, uniquement sur la page de l'outil concerné.

## 6. Limites de l'OCR, du scanner et des conversions

- **OCR** : Tesseract LSTM en WebAssembly, 2 à 15 s par page selon l'appareil ; excellent sur du texte
  imprimé net à 200–300 dpi, faible sur l'écriture manuscrite, les polices fantaisie, les photos floues et
  les tableaux en colonnes. Le PDF recherchable conserve l'image et ajoute une couche de texte invisible
  (mots de confiance < 30 ignorés) ; la mise en forme n'est pas reconstruite. 200 pages max. Mémoire :
  le moteur (≈ 50–100 Mo en mémoire) plus la page rendue à 200 dpi.
- **Scanner / perspective** : la détection des coins suppose une feuille plus claire que le fond ; un
  document plié ou courbé reste déformé localement ; résolution de sortie plafonnée (2400 px scanner,
  3000 px perspective) pour tenir sur mobile. La capture caméra exige HTTPS et un navigateur récent ;
  l'import de photos reste toujours disponible.
- **PDF ↔ images** : rendu jusqu'à 300 dpi avec plafond d'environ 25 Mpx par page. Les images extraites
  ne couvrent pas CCITT/JBIG2 ; le JPEG 2000 est fourni en .jp2.
- **Caviardage** : les pages marquées deviennent des images (150–300 dpi) ; la recherche automatique ne
  voit que le texte réel (pas les scans) ; l'utilisateur doit relire le résultat.
- **Markdown / texte → PDF** : polices standard (latin, WinAnsi), images ignorées (texte alternatif
  conservé), tableaux à colonnes égales, HTML brut ignoré.
- **Comparaison de PDF** : texte uniquement, page à page ; une page insérée décale les suivantes.
- **Images** : formats lus par le navigateur (JPG, PNG, WebP, GIF première image, BMP, AVIF, SVG) ;
  HEIC et TIFF exclus ; l'EXIF n'est pas conservé dans les fichiers produits (orientation appliquée).
- **Codes-barres** : le dessin est conforme aux spécifications (clés EAN, sommes Code 128), mais
  l'attribution de numéros GS1 n'est pas du ressort de l'outil ; tester à la douchette avant impression
  en série.

## 7. Estimation des coûts récurrents

Aucune API payante n'est utilisée et aucune ne l'est par défaut.

| Poste                                                         | Obligatoire ?             | Estimation                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nom de domaine                                                | Oui                       | 10–15 €/an                                                                                                                                                                                                                     |
| Hébergement statique (Vercel, Netlify, Cloudflare Pages, VPS) | Oui                       | 0 € sur les offres gratuites tant que le trafic reste modeste ; 20 €/mois environ au-delà (offre Pro) ou 5–10 €/mois pour un VPS                                                                                               |
| Bande passante                                                | Oui (incluse ou facturée) | Un utilisateur OCR télécharge jusqu'à ≈ 13 Mo (moteur + modèle français), ≈ 5 Mo pour pdf.js ; à surveiller si l'OCR devient populaire, ou servir ces actifs depuis un CDN avec cache long (déjà en-têtes immuables côté Next) |
| Certificat HTTPS                                              | Oui                       | 0 € (Let's Encrypt / inclus chez l'hébergeur)                                                                                                                                                                                  |
| Mesure d'audience                                             | Non                       | 0 € (GA4) ou ≈ 9 €/mois (Plausible), chargée uniquement après consentement                                                                                                                                                     |
| CMP certifiée (obligatoire seulement si publicité en EEE)     | Non                       | 0–50 €/mois selon le trafic                                                                                                                                                                                                    |
| Publicité AdSense, affiliation                                | Non                       | Gratuit à mettre en place (revenu, pas coût)                                                                                                                                                                                   |
| Maintenance des dépendances                                   | Oui (temps)               | Quelques heures par trimestre (mises à jour pdf.js, Tesseract, Next)                                                                                                                                                           |

Total minimal : le prix du domaine, soit environ 1 €/mois ; configuration confortable avec hébergement
Pro et Plausible : environ 30 €/mois.

## Audit postérieur

Un audit de qualité a été mené après la fin de l'extension (`docs/AUDIT_QUALITE.md`) : il a confirmé et
corrigé deux défauts fonctionnels (chiffrement AES-128 inopérant, PDF chiffré présenté comme endommagé par
l'outil de vérification), une limite non appliquée (500 pages en comparaison) et quatre défauts
d'accessibilité sérieux, et porté la couverture à un parcours Playwright par outil avec vérification des
fichiers produits. Les chiffres de la section 4 sont ceux de la fin de l'extension ; ceux de l'audit sont dans
son rapport (133 tests unitaires, 77 parcours × 2 projets).

## 8. Améliorations recommandées (par ordre de priorité)

1. **Déployer puis observer** : définir `NEXT_PUBLIC_SITE_URL`, compléter l'identité légale, déclarer le
   sitemap dans Search Console, et attendre les requêtes réelles avant d'ajouter des outils.
2. **Web Worker pour pdf-lib et les filtres d'image** : les fonctions sont déjà pures ; gain de fluidité
   sur mobile pour les gros documents.
3. **Polices Unicode** (fontkit + une police libre sous-ensemble) pour Markdown → PDF, page de garde,
   numérotation et éditeur : supprimerait la principale limite visible.
4. **OCR** : ajouter des langues à la demande (deu, spa, ita), un mode « tableau » et la détection
   automatique de l'orientation ; mettre en cache le moteur dans le navigateur (Cache Storage) pour les
   visites suivantes.
5. **Comparaison visuelle de PDF** (différence de pixels page à page) en complément du texte.
6. **Conversion** : DOCX → PDF via un rendu HTML approximatif (mammoth + impression) présenté honnêtement
   comme approximatif, ou pas du tout ; ne pas promettre la fidélité.
7. **Qualité** : audit Lighthouse sur l'hébergement final, tests de performance sur mobile bas de gamme
   (OCR, scanner), et vérification manuelle du glisser-déposer tactile.
8. **Guides** : un article par nouvelle famille d'outils (OCR, caviardage, codes-barres, calendriers) pour
   soutenir le référencement des pages outil.
