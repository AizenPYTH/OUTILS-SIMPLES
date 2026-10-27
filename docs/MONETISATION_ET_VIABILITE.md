# Monétisation et viabilité

Date : 2026-10-27. Ce document décrit ce que le code prépare, ce qui est désactivé, et les décisions
qui restent au propriétaire. Aucun compte, identifiant ou chiffre de revenu n'est inventé.

## 1. Principes non négociables

1. Les outils restent gratuits, sans compte, et complets sans publicité.
2. Aucun script tiers n'est chargé sans consentement ; aucun contenu de fichier, nom de fichier, texte
   OCR ou résultat n'est transmis à un système publicitaire ou analytique (liste blanche des propriétés
   d'événements, `src/lib/analytics/events.ts`).
3. Les emplacements publicitaires ne sont jamais dans les zones de dépôt, dans le modificateur PDF, ni
   déguisés en bouton de téléchargement.
4. Tout est désactivé par défaut (`NEXT_PUBLIC_ADS_ENABLED=false`, `NEXT_PUBLIC_ANALYTICS_PROVIDER=none`).

## 2. Leviers envisagés

| Levier                                                                   | État dans le code                                                                                                                                                           | Ce qu'il faut pour l'activer                                                                                                                                                      | Risques                                                                                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publicité display (Google AdSense)                                       | Composant `AdSlot` et configuration prêts, désactivés ; hôtes Google ajoutés au CSP seulement si activé ; infrastructure détaillée dans `docs/MONETISATION_PUBLICITAIRE.md` | Compte AdSense approuvé (site en ligne, trafic réel, pages légales complètes), CMP certifiée TCF v2.2 pour le trafic EEE/Royaume-Uni/Suisse (exigence Google), identifiants réels | Revenus faibles au départ ; dégradation possible de la vitesse et de la confiance si trop d'emplacements ; refus AdSense si contenu jugé insuffisant |
| Affiliation (guides)                                                     | Page `/affiliation/` et `/en/affiliate-disclosure/` rédigées ; aucun lien affilié présent                                                                                   | Programmes pertinents (logiciels PDF, scanners), mention « lien affilié » à côté de chaque lien                                                                                   | Conflit d'intérêt si les recommandations ne sont pas sincères                                                                                        |
| Premium (limites plus hautes, lots, fonctions avancées)                  | Chaque outil déclare `premium` et `featureFlags` ; limites centralisées (`src/config/limits.ts`) ; aucun paiement                                                           | Prestataire de paiement (Stripe), vérification serveur par webhook, base de données, comptes utilisateurs, CGV, TVA                                                               | Introduit un serveur et des données personnelles : à encadrer dans la politique de confidentialité                                                   |
| Dons / soutien                                                           | Rien                                                                                                                                                                        | Une page et un prestataire (Liberapay, Ko-fi, Stripe Payment Link)                                                                                                                | Faible, mais sans impact sur la confiance                                                                                                            |
| Version « entreprise » hors ligne (PWA installable, déploiement interne) | Mode hors ligne déjà fonctionnel                                                                                                                                            | Offre commerciale, licence, support                                                                                                                                               | Nécessite une activité commerciale réelle                                                                                                            |

## 3. Coûts et ordre de grandeur (à confirmer par le propriétaire)

- Hébergement statique/edge : de 0 à quelques dizaines d'euros par mois selon le trafic (les moteurs
  WebAssembly et modèles OCR pèsent plusieurs Mo par visiteur qui les utilise : surveiller la bande
  passante, activer la compression et un cache long sur `/pdfjs`, `/ocr`, `/qpdf`, `/heif`, `/fonts`).
- Nom de domaine : ≈ 10–20 € par an.
- CMP certifiée : gratuite pour de petits volumes chez plusieurs fournisseurs, payante au-delà.
- Aucun coût de traitement serveur : tout s'exécute chez le visiteur.

## 4. Indicateurs à suivre avant toute décision

- Trafic organique par page (Search Console) et par langue (FR / EN) ; taux de réussite des outils
  (`tool_success` / `tool_error`, une fois la mesure activée avec consentement).
- Part du trafic EEE (détermine l'obligation de CMP) ; part mobile (place des emplacements).
- Vitesse : Core Web Vitals avant/après activation des annonces (`docs/AUDIT_PERFORMANCES.md`).

## 5. Décisions qui restent au propriétaire

1. Activer ou non la publicité, et à quel seuil de trafic.
2. Choisir une CMP certifiée et l'intégrer (`NEXT_PUBLIC_CONSENT_MODE=external`).
3. Définir l'offre premium (si elle existe) et son infrastructure serveur.
4. Compléter l'identité légale (`docs/MISE_EN_LIGNE.md`) : préalable à toute monétisation.
