# Plan de finalisation : audit de reprise, priorités, critères d'acceptation

Date de l'audit : 2026-10-27. Branche `claude/festive-turing-f4fmzh`, dernier commit `c97e3be`,
arbre de travail propre (aucune modification locale non validée avant le début de cette mission).

## 1. État réel constaté

| Point                     | Constat                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Outils publiés            | 69, dans 9 familles actives (registre `src/lib/tools/registry`, vérifié par `tests/unit/registry.test.ts`)                                                                                                                                                   |
| Routes                    | App Router : `/`, `/outils/`, `/[category]/`, `/[category]/[slug]/`, `/guides/`, `/guides/[slug]/`, 9 pages éditoriales et légales, `/hors-ligne/`, `/verifiez-le/`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, images Open Graph par route        |
| Langue                    | Français uniquement : dictionnaire `src/lib/i18n/fr.ts` (311 lignes, `t` constant), contenu éditorial dans le registre (français), **≈ 330 chaînes d'interface en dur dans les composants d'outils** (surtout `src/components/pdf`, `scan`, `dev`, `images`) |
| Sélecteur de langue       | Présent mais factice (`language-selector.tsx` : « D'autres langues arriveront prochainement »)                                                                                                                                                               |
| Métadonnées               | `buildPageMetadata` : canonical + `languages: { fr }` seulement, `lang="fr"` en dur dans la racine                                                                                                                                                           |
| Tests                     | 224 tests Vitest ; 122 parcours Playwright (desktop Chromium + Pixel 7) ; CI GitHub Actions (typecheck, lint, format, unitaires, build, Playwright)                                                                                                          |
| Hors ligne                | Service worker versionné (`src/sw/service-worker.js`), outils enregistrables, page `/hors-ligne/`, test Playwright                                                                                                                                           |
| Déploiement               | Aucun. Hébergeur non déterminé par le dépôt (pas de `vercel.json`, pas de Dockerfile)                                                                                                                                                                        |
| Informations propriétaire | `NEXT_PUBLIC_LEGAL_*` et `NEXT_PUBLIC_SITE_URL` à fournir (`docs/MISE_EN_LIGNE.md`)                                                                                                                                                                          |

Documents demandés par la mission et absents du dépôt (ils sont créés par cette mission) :
`AUDIT_PERFORMANCES.md`, `AUDIT_SECURITE_ET_CONFIDENTIALITE.md`, `PLAN_LANCEMENT.md`,
`RAPPORT_FINAL_MISSION_OUTILIA.md` (l'équivalent existant est `RAPPORT_AUDIT_ACTIONS.md`),
`INTERNATIONALISATION.md`, `AUDIT_SEO_FINAL.md`, `MONETISATION_ET_VIABILITE.md`.

## 2. Décisions d'architecture pour la version anglaise

- **Le français reste à la racine** (`/pdf/fusionner/`) : les URL existantes sont conservées sans
  redirection ; **l'anglais vit sous `/en/`** (`/en/pdf/merge/`, slugs anglais stables par
  identifiant d'outil). La cible `/fr/` + `/en/` recommandée aurait imposé des redirections
  permanentes de toutes les URL françaises pour un gain nul : écartée, documentée.
- Deux racines de mise en page (groupes de routes `(fr)` et `en`) pour déclarer `lang` sans
  rendu dynamique ; passage d'une langue à l'autre = chargement complet (acceptable).
- Locale ambiante : côté serveur, mémo par requête (`React.cache`) posé par la racine de chaque
  langue et par chaque page `/en` ; côté client, contexte + variable de module posée par un
  fournisseur. Le dictionnaire `t`, les requêtes du registre (`getPublishedTools`,
  `getToolById`…), les chemins (`getToolPath`) et les métadonnées lisent cette locale : les
  composants existants deviennent bilingues sans réécriture.
- Contenu anglais : dictionnaire `en.ts` de même forme que `fr.ts` (typé, clés manquantes =
  erreur TypeScript), surcharges anglaises du registre par identifiant (noms, descriptions, SEO,
  étapes, limites, FAQ, slugs), familles, guides traduits, pages légales anglaises distinctes.
- Honnêteté : un outil dont l'interface contient encore des chaînes françaises en dur affiche un
  avertissement sur sa page `/en` et n'est **pas indexable** tant qu'il n'est pas dans la liste
  des outils entièrement traduits (vérifiée par un test qui analyse les fichiers sources).

## 3. Priorités et critères d'acceptation

| Priorité | Lot                                                                                                                                              | Critère d'acceptation                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Version anglaise : architecture, chrome, accueil, catalogue, familles, pages d'outils, modificateur, pages légales, sélecteur, SEO international | pages `/en` servies avec `lang="en"`, hreflang réciproques, sitemap exact, tests FR/EN verts, aucune chaîne française sur les pages EN déclarées complètes |
| P0       | Non-régression FR                                                                                                                                | suites existantes vertes sur le build final                                                                                                                |
| P0       | Préparation de mise en ligne                                                                                                                     | contrôle automatisé des variables légales en production, checklist exécutable                                                                              |
| P1       | Compatibilité, accessibilité, sécurité, hors ligne, SEO                                                                                          | audits documentés, défauts réels corrigés, limites écrites                                                                                                 |
| P1       | Performance mesurée                                                                                                                              | mesures avant/après sur le build, méthode reproductible                                                                                                    |
| P2       | Champs de formulaire, PowerPoint/PDF-A, monétisation                                                                                             | étude et décision documentées ; implémentation seulement si fiable                                                                                         |

## 4. Risques identifiés avant lancement

1. Volume des chaînes françaises en dur dans les outils : résolu pendant la mission (≈ 1 500 chaînes
   passées par `tr()` avec leur texte anglais, 69/69 outils déclarés traduits, vérification par test).
2. Aucune validation sur appareil réel (iPhone, Safari) : procédure manuelle obligatoire.
3. Hébergeur inconnu : le traitement de `sw.js` par le CDN et les en-têtes doivent être vérifiés.
4. Informations légales absentes : le site les affiche « à compléter » et doit refuser un build de
   production sans elles (contrôle ajouté par cette mission).
