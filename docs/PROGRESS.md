# Suivi d'avancement

## Phase 1 — Socle ✅

- [x] Inspection du dépôt (vide) et choix de l'architecture
- [x] Configuration centrale (marque, env Zod, limites, sécurité/CSP)
- [x] Registre d'outils typé + validation + recherche
- [x] Design system (tokens charte, polices auto-hébergées, composants UI)
- [x] Layout global (header, recherche Ctrl K, thème, sélecteur de langue, menu mobile, footer)
- [x] Catalogue en accueil (recherche, filtres, populaires, sections, état vide avec suggestions)
- [x] Pages catégorie, modèle de page outil, pages légales/à propos/contact, guides
- [x] SEO : métadonnées uniques, canonical, robots, sitemap, JSON-LD, 404

## Phase 2 — Cœur PDF ✅

- [x] Chargement validé, erreurs utilisateur, plages de pages, noms de fichiers
- [x] Fusion, extraction, division, rotation, organisation
- [x] Modèle d'annotations + export (texte, chemins, formes, surlignage, images, pages pivotées)
- [x] Filigrane (texte/image, positions, mosaïque, marqueur retirable) + analyse + retrait
- [x] Compression (copie des pages, flux d'objets, réencodage d'images injectable)
- [x] Formulaires (inspection, remplissage, aplatissement)
- [x] 56 tests Vitest sur fixtures synthétiques

## Phase 3 — Interface PDF ✅

- [x] Couche pdf.js, vignettes paresseuses, zone de dépôt, états busy/done/error
- [x] 9 outils à état (fusion, division, extraction, organisation, rotation, compression, filigrane,
      gestion filigrane, formulaire)
- [x] Espace d'annotation plein écran (éditeur, annoter, ajouter du texte, signer)

## Phase 4 — Fiabilité & monétisation ✅

- [x] Limites, nettoyage mémoire, messages d'erreur, raccourcis clavier
- [x] Consentement first-party, analytics gated, AdSlot désactivé par défaut
- [x] Guides éditoriaux (5 articles)

## Phase 5 — Vérifications ✅

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- [x] `pnpm test:e2e` (desktop + mobile)

## Phase 6 — Documentation ✅

- [x] README, ARCHITECTURE, KNOWN_LIMITATIONS, .env.example

## Reste à faire (hors périmètre MVP)

- [ ] Identité légale et domaine (propriétaire)
- [ ] CMP certifiée + AdSense (propriétaire)
- [ ] Web Worker pour pdf-lib, polices Unicode
- [ ] Catégorie Images, QR codes
