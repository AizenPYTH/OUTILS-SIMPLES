# Plan de lancement

Date : 2026-10-27. **Aucun déploiement n'a été effectué** : ce plan décrit ce qui reste à faire par le
propriétaire, dans l'ordre, et comment vérifier chaque étape. La liste de contrôle technique détaillée est
dans `docs/MISE_EN_LIGNE.md` ; la procédure sur appareils réels dans `docs/VALIDATION_APPAREIL_REEL.md`.

## 0. Préalables (bloquants)

| #   | Action                                                                                                                                               | Comment vérifier                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 0.1 | Choisir l'hébergeur (statique/edge ou Node : le site n'a aucun endpoint serveur, seuls le rendu, les images OG et les en-têtes sont servis par Next) | Un déploiement de prévisualisation répond en HTTPS                    |
| 0.2 | Renseigner l'identité légale et l'URL publique dans l'environnement de production (jamais dans le dépôt)                                             | `pnpm check:launch` avec les variables de production : « 0 bloquant » |
| 0.3 | Relire `/mentions-legales/`, `/confidentialite/`, `/contact/` et leurs versions `/en/` : aucun encadré « à compléter »                               | Visite des 6 pages                                                    |
| 0.4 | Décider : analytics (aucun, Plausible, GA4) et publicité (non par défaut)                                                                            | Variables `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_ADS_ENABLED` |

## 1. Déploiement de prévisualisation (J-7)

1. `pnpm check` (typecheck, lint, tests, build) puis `pnpm test:e2e` sur le commit candidat ; CI verte.
2. Déployer sur une URL de prévisualisation **avec `robots` en noindex** (en-tête `X-Robots-Tag: noindex`
   côté hébergeur) tant que le domaine définitif n'est pas actif.
3. Vérifier les en-têtes (`curl -I`) : CSP, HSTS, `Cache-Control: no-cache` sur `/sw.js`.
4. Parcours manuels sur appareils réels (iPhone Safari, Android Chrome, Firefox desktop) selon
   `docs/VALIDATION_APPAREIL_REEL.md` : fusion, compression, scanner (caméra), OCR, modificateur, HEIC,
   mode hors ligne, pages `/en/`.
5. Tester une page de partage (Open Graph) FR et EN avec un validateur.

## 2. Mise en ligne (J0)

1. Domaine définitif, HTTPS, redirection `www` ↔ apex choisie une fois pour toutes (le canonical suit
   `NEXT_PUBLIC_SITE_URL`).
2. Retirer le `noindex` de prévisualisation ; vérifier `/robots.txt` et `/sitemap.xml` en production.
3. Search Console : propriété, soumission du sitemap, vérification `hreflang` (rapport « Ciblage
   international ») après quelques jours.
4. Surveillance minimale : disponibilité (ping externe), erreurs navigateur (aucun outil tiers n'est
   intégré : à décider, en respectant le consentement).

## 3. Après lancement (J+1 à J+30)

- Vérifier l'indexation des pages FR puis EN ; corriger les éventuels « page alternative avec balise
  canonique correcte » (attendu pour les doublons de langue : non bloquant).
- Mesurer les Core Web Vitals réels (Search Console) et comparer à `docs/AUDIT_PERFORMANCES.md`.
- Mettre à jour le service worker à chaque déploiement (version automatique au build) ; vérifier qu'une
  visite en ligne récupère la nouvelle version (bannière « mise à jour disponible » du site).
- Décider de la monétisation seulement avec des données (`docs/MONETISATION_ET_VIABILITE.md`).

## 4. Procédure de retour arrière

Le site est statique : redéployer le commit précédent suffit. Le service worker versionné remplace
l'ancien à la visite suivante ; en cas de problème grave de cache, publier une version du SW qui vide
les caches (`KEEP` vide dans `src/sw/service-worker.js`) puis redéployer la version saine.

## 5. Ce que ce plan ne couvre pas

Choix d'hébergeur et coûts, création de comptes (Search Console, AdSense, CMP), rédaction juridique
définitive : décisions et démarches du propriétaire, hors du code.
