# Internationalisation : architecture, conventions, couverture

Date : 2026-10-27. Langues : français (langue source, par défaut) et anglais.

## 1. Choix d'architecture

| Décision                        | Choix retenu                                                                                                                                                                                                                      | Pourquoi                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                             | Français à la racine (`/pdf/fusionner/`), anglais sous `/en/` avec des slugs anglais (`/en/pdf/merge/`)                                                                                                                           | Aucune URL française existante ne change ni ne redirige ; chaque langue a des slugs lisibles dans sa langue.                                                                                                |
| Racines                         | Deux racines App Router : `src/app/(fr)/layout.tsx` et `src/app/en/layout.tsx`, qui rendent le même `RootDocument` avec `lang="fr"` ou `lang="en"`                                                                                | `lang` est déclaré statiquement, sans middleware ni rendu dynamique. Passer d'une langue à l'autre est un chargement complet de page (acceptable : on change rarement de langue).                           |
| Détection                       | Aucune redirection par adresse IP ni par `Accept-Language`                                                                                                                                                                        | Le visiteur et les moteurs de recherche voient toujours la langue de l'URL ; le sélecteur propose l'autre langue.                                                                                           |
| Locale ambiante                 | Serveur : mémo par requête (`React.cache`) posé par `setRequestLocale()` dans chaque racine et chaque page `/en`. Client : `LocaleProvider` (contexte + variable de module), repli sur `<html lang>`                              | Les composants existants (`t.nav.home`, `getPublishedTools()`, `getToolPath()`) deviennent bilingues sans réécriture : ils lisent `getLocale()` par défaut.                                                 |
| Dictionnaire                    | `src/lib/i18n/fr.ts` (source, typé) et `en.ts` (même forme, vérifiée par test) ; `t` est un proxy résolu à l'accès                                                                                                                | Une clé manquante en anglais est une erreur TypeScript.                                                                                                                                                     |
| Interfaces d'outils             | `tr("Texte français")` (`src/lib/i18n/messages.ts`) avec une carte français → anglais par domaine (`src/lib/i18n/messages/en/*.ts`) ; placeholders `{n}` ; correspondance par motif pour les messages produits ailleurs (workers) | Le français reste la clé : aucune chaîne française n'a été modifiée, les tests Playwright existants restent valides ; `tr(error.message)` au point d'affichage traduit aussi les erreurs des bibliothèques. |
| Registre des outils             | Surcharges anglaises par identifiant (`src/lib/tools/registry/en/*.ts`, type `ToolLocalization` : slug, nom, descriptions, mots-clés, SEO, étapes, limites, FAQ, note de confidentialité) fusionnées par `getRegistry("en")`      | Le français reste la source ; un outil sans surcharge serait servi en français avec `translated: false`, affiché comme partiel et non indexable.                                                            |
| Familles, guides, pages légales | `categories-en.ts`, `guides-en.ts` (avec `frSlug` pour l'équivalence), pages anglaises distinctes sous `src/app/en/(site)/`                                                                                                       | Les pages légales anglaises sont des traductions de courtoisie ; la version française fait foi (indiqué sur la page).                                                                                       |
| 404                             | Page fourre-tout `[...rest]/page.tsx` dans chaque racine qui appelle `notFound()`                                                                                                                                                 | Chaque arbre rend sa propre page 404 (`not-found.tsx`) dans sa langue.                                                                                                                                      |

## 2. Honnêteté de la couverture

- `src/lib/i18n/ui-coverage.ts` liste les outils dont l'interface est entièrement traduite. Un outil absent de la liste affiche, sur sa page `/en`, l'alerte « The text of this page is in English, but this tool's own interface still contains some French » (`data-testid="partial-translation"`) et sa page est `noindex`, exclue du sitemap et des hreflang.
- `scripts/i18n-scan.mjs` repère les chaînes qui ressemblent à du français hors `tr()`/`t` (accents et mots courants). `tests/unit/i18n.test.ts` exige que la liste de couverture contienne tous les outils publiés ; `tests/unit/i18n-messages.test.ts` exige une traduction anglaise pour chaque clé `tr("…")` du code et vérifie que les textes anglais ne contiennent ni français ni placeholders manquants.
- Limites connues : le scanner est heuristique (voir § 5) ; la page 404 est rendue côté client par Next.js après une coquille d'erreur (statut 404 correct, `lang` et texte justes après hydratation, mais le HTML brut initial n'a pas d'attribut `lang` : comportement de Next.js quand `notFound()` est levé dans une page, identique à la version française précédente).

## 3. SEO international

- `lang` déclaré par racine ; `canonical` propre à chaque langue ; `hreflang` réciproques `fr`, `en` et `x-default` (= français, langue par défaut du site) sur les pages statiques (table `src/lib/i18n/routes.ts`), les familles, les outils (seulement si indexables dans les deux langues) et les guides traduits (`alternateGuideSlug`).
- `sitemap.xml` : entrées des deux langues avec `xhtml:link` alternates ; aucune route anglaise vide ; `/hors-ligne/` et `/en/offline/` exclues (noindex).
- Open Graph : `og:locale` `fr_FR` / `en_US` ; images OG anglaises générées pour l'accueil, les familles, les outils et les guides (`src/app/en/**/opengraph-image.tsx`) avec le bandeau traduit.
- JSON-LD : `inLanguage` = locale ; l'action de recherche pointe vers le catalogue de la langue.

## 4. Sélecteur de langue

`src/components/layout/language-switcher.tsx` : deux liens réels (`<a hreflang lang aria-current>`), accessibles au clavier et aux lecteurs d'écran (`nav aria-label="Langue"/"Language"`, nom accessible « Français » / « English »). La cible est l'alternate `hreflang` de la page courante lu dans `<head>` (observé par `MutationObserver`, donc exact après une navigation client) ; à défaut (page sans équivalent), l'accueil de l'autre langue. Aucune redirection automatique.

## 5. Ce qui reste du ressort d'une relecture humaine

- Les traductions ont été produites dans cette session et vérifiées par des contrôles automatiques (forme du dictionnaire, longueurs SEO, absence de mots français, placeholders) : une relecture par un locuteur natif reste recommandée avant une communication grand public en anglais.
- Les noms de jours fériés français, les formats de dates et les exemples propres à la France (TVA, papier Seyès) sont conservés et signalés comme tels dans la version anglaise.
- Les modèles OCR : seul le modèle français est enregistré hors ligne avec l'outil OCR ; l'anglais est téléchargé à la demande (documenté sur `/en/offline/`).
- Le scanner de chaînes ignore les identifiants, chemins et noms de polices ; les faux positifs connus sont listés dans la liste d'exclusion du test.

## 6. Ajouter une langue

1. Ajouter le code dans `locales` (`src/lib/i18n/locale.ts`), un dictionnaire de même forme, une table de routes statiques, les surcharges du registre, des familles et des guides, une carte `messages/<lang>/`.
2. Créer une racine `src/app/<lang>/` sur le modèle de `src/app/en/` (layout, `(site)`, `[...rest]`, `not-found`, `error`, images OG, pages légales).
3. Les tests `tests/unit/i18n.test.ts` et `e2e/i18n.spec.ts` servent de gabarit.
