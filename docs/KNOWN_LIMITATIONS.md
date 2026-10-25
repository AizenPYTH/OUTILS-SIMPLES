# Limites connues et améliorations prévues

## Limites fonctionnelles (documentées sur les pages concernées)

- **Éditeur** : les ajouts sont superposés ; le texte d'origine n'est ni modifié ni reformaté. Pas d'OCR.
- **Polices** : 14 polices standard PDF (WinAnsi). Caractères non latins et emojis remplacés par « ? »
  avec avertissement. L'intégration de polices Unicode (fontkit) est l'évolution naturelle.
- **Annotations** : aplaties dans le contenu des pages, pas d'objets `/Annot` natifs éditables ailleurs.
- **Surlignage / soulignement** : par zone, sans sélection automatique du texte (pas de couche texte pdf.js
  interactive pour l'instant).
- **Signature** : visuelle uniquement, pas de signature numérique (PKCS#7) ni qualifiée eIDAS.
- **Filigrane** : retrait fiable uniquement pour les filigranes OUTILIA (marqueur) et les annotations
  `/Watermark`. Les filigranes fondus dans le contenu ou dans des images ne sont pas traités, par choix.
- **Compression** : seules les images DCT (JPEG) et Flate RVB/gris 8 bits sans masque sont réencodées ;
  les autres sont conservées. Gain non garanti (documents déjà compacts).
- **Formulaires** : AcroForm uniquement ; XFA non pris en charge ; champs de signature non signables.
- **Fusion / division** : signets et liens internes non conservés.
- **Fichiers chiffrés** : refusés avec message clair (pas de déverrouillage par mot de passe).

## Limites techniques

- pdf-lib s'exécute sur le thread principal : sur mobile d'entrée de gamme, un document de plusieurs
  centaines de pages ou de plusieurs dizaines de Mo peut bloquer l'interface quelques secondes. Prévu :
  exécuter les opérations dans un Web Worker (les fonctions sont déjà pures et sans DOM, sauf le
  réencodage d'images qui peut utiliser `OffscreenCanvas`).
- Le réencodage d'images via canvas convertit les JPEG niveaux de gris en RVB (léger surpoids possible,
  l'original est alors conservé).
- La bannière de consentement interne n'est pas une CMP certifiée Google : obligatoire avant AdSense en EEE.
- Pas d'image Open Graph dédiée (carte `summary`) ; à produire avec la charte.
- `'unsafe-inline'` dans `script-src` (contrainte du rendu statique Next.js).

## Qualité / tests

- Les tests Playwright couvrent chaque outil avec un parcours réel, mais pas le glisser-déposer tactile de
  dnd-kit (testé manuellement via les boutons flèches / clavier) ni le pad de signature dessiné (le mode
  « Taper » est testé ; le mode « Dessiner » repose sur les mêmes conversions).
- Aucun test de performance automatisé ; à mesurer avec Lighthouse sur l'hébergement final.

## Prochaines étapes recommandées

1. Compléter l'identité légale (`src/config/site.ts`), déployer avec `NEXT_PUBLIC_SITE_URL`, déclarer le
   sitemap dans Search Console et observer les requêtes réelles avant d'étendre le catalogue.
2. Déplacer les opérations pdf-lib dans un Web Worker et ajouter l'intégration de polices Unicode.
3. Lancer la catégorie Images (compression, redimensionnement, conversion WebP) sur la même architecture
   (`SingleFileTool`-like pour les images), puis le générateur de QR codes.
