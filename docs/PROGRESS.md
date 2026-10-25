# Suivi d'avancement

## MVP (phases 1 à 6) ✅

- [x] Socle Next.js 16, design system (charte), registre d'outils typé, catalogue, SEO, pages légales
- [x] Cœur PDF (opérations pures testées) et 13 outils PDF avec éditeur plein écran
- [x] Monétisation désactivée par défaut (consentement, AdSlot, analytics gated), guides
- [x] Vérifications, documentation, premier déploiement possible

## Extension du catalogue — lot 1 ✅ (`fa9916b`)

- [x] Registre scindé par domaine (`src/lib/tools/registry/*`), 9 catégories, rendu client uniquement
- [x] PDF : extraire le texte, rechercher, PDF → images, images → PDF, recadrer, numéroter, protéger,
      déverrouiller, vérifier/réparer, métadonnées (qpdf WebAssembly pour le chiffrement)
- [x] Numérisation : scanner mobile (caméra, filtres, pages), OCR Tesseract + PDF recherchable
- [x] Images : compresser, redimensionner, recadrer, convertir, pivoter (lot + ZIP)
- [x] Texte : compteur, casse, nettoyage, diff · Développeur : JSON, CSV → JSON · QR code
- [x] Actifs auto-hébergés (pdf.js, Tesseract, modèles fra/eng, qpdf), CSP `'wasm-unsafe-eval'`

## Extension du catalogue — lot 2 ✅ (`8795989`)

- [x] Correction de perspective (détection des coins, poignées, aperçu, export)
- [x] EXIF (lecture, suppression sans perte), filigrane image par lot
- [x] PDF : liens, images intégrées, comparaison, caviardage réel
- [x] Markdown → PDF et texte → PDF (mise en page maison, polices standard)
- [x] Slug, Base64 (texte et fichier), URL, entités HTML
- [x] Débordement mobile corrigé, serveur Playwright fiabilisé, balayage mobile des pages

## Extension du catalogue — lot 3 ✅ (`a806b09`)

- [x] Développeur : UUID, mots de passe, hash, regex, timestamp
- [x] Calculatrices : pourcentage, TVA, dates et jours ouvrés, unités
- [x] Codes : lecteur de QR, codes-barres (EAN-13/8, UPC-A, Code 128, Code 39), couleurs et contraste,
      palette d'image
- [x] Documents : feuilles à imprimer, calendrier, page de garde

## Vérifications (dernier passage)

- [x] `pnpm typecheck` · `pnpm lint` · `pnpm test` (121) · `pnpm build` (96 pages) · `pnpm test:e2e`
      (56 parcours × desktop + mobile)

## Corrections ciblées et simplification du design ✅

- [x] Principes de design écrits avant modification (`docs/DESIGN_PRINCIPES.md`) ; sites de référence
      inaccessibles depuis l'environnement, signalé sans analyse inventée
- [x] Accueil simplifié, `/outils/` = catalogue, en-tête court, menu tactile, carte unique, pages d'outil
      orientées action
- [x] Éditeur : netteté (ratio exact, zoom × densité), ajustement à la largeur, zoom 400 %
- [x] Éditeur : « Modifier le texte » (remplacement réel dans le flux, police d'origine ou standard,
      aperçu depuis le fichier modifié, OCR proposé pour les scans) — `docs/EDITION_TEXTE.md`
- [x] Scanner : photo d'origine conservée (filtre Couleur par défaut), aperçu Garder / Reprendre,
      compteur, erreurs explicites, Redresser (quatre coins)
- [x] Rapport : `docs/RAPPORT_CORRECTIONS.md`

## Mission qualité produit, OCR, édition et refonte ✅

- [x] OCR : orientations multiples (passes + baseline), inclinaison, colonnes, prétraitement sur copie,
      couche de texte tournée ; suite synthétique mesurée (Tesseract réel en Node) ; étiquette e2e
- [x] Éditeur : passages tournés, fragments fusionnés, ligatures ; fidélité sur 7 PDF de producteurs différents
- [x] Refonte design v2 : identité, accueil 10 sections, catalogue structuré, en-tête/pied de page,
      rail d'éditeur par tâche, caméra plein écran mobile
- [x] Matrice des 66 outils (`docs/MATRICE_OUTILS.md`), procédure appareil réel, rapport `docs/RAPPORT_MISSION.md`

## Reste à faire

- [ ] Identité légale, domaine, `NEXT_PUBLIC_SITE_URL`, Search Console (propriétaire)
- [ ] CMP certifiée + AdSense si publicité (propriétaire)
- [ ] Web Worker pour pdf-lib / filtres d'image ; polices Unicode ; cache persistant du moteur OCR
- [ ] Comparaison visuelle de PDF ; langues OCR supplémentaires ; guides pour les nouvelles familles
