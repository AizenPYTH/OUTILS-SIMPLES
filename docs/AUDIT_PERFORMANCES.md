# Audit de performance

Date : 2026-10-27 (mission de validation pré-lancement). Build de production (`next build`,
Turbopack), serveur `next start` local, Node 22, Chromium Playwright pour Lighthouse 13.5. Toutes les
mesures de ce document ont été **exécutées** sur le commit décrit dans `docs/RAPPORT_FINALISATION_AVEROPDF.md` ;
rien n'est estimé.

## 1. Correction de la mesure précédente

Le rapport antérieur annonçait une hausse du JavaScript initial de 183 Ko à 221 Ko (accueil) après
l'internationalisation. La comparaison a été refaite en construisant le commit d'avant la version
anglaise (`c97e3be`) dans un worktree séparé et en mesurant les deux builds avec le même script :

- la mesure « 221 Ko » incluait le chunk de polyfills (38 Ko gzip) servi avec l'attribut `noModule`,
  que les navigateurs modernes ne téléchargent pas ; la mesure « 183 Ko » l'excluait ;
- à méthode égale (scripts `<script src>` sans `noModule`, gzip), l'accueil français est passé de
  **180 Ko à 183 Ko** (+3 Ko) et la page d'outil de **172 Ko à 173 Ko** (+1 Ko). La version anglaise
  n'a donc pas alourdi les pages françaises de façon significative.

## 2. JavaScript initial (navigateurs modernes, gzip, scripts référencés par le HTML)

| Page                       | Avant i18n (`c97e3be`) | Avant cette mission | Après cette mission |
| -------------------------- | ---------------------- | ------------------- | ------------------- |
| Accueil FR `/`             | 180 Ko                 | 183 Ko              | 183 Ko              |
| Accueil EN `/en/`          | —                      | 229 Ko              | **188 Ko**          |
| Outil FR `/pdf/fusionner/` | 172 Ko                 | 173 Ko              | 173 Ko              |
| Outil EN `/en/pdf/merge/`  | —                      | 219 Ko              | **178 Ko**          |
| Catalogue FR `/outils/`    | 223 Ko                 | 228 Ko              | 228 Ko              |
| Catalogue EN `/en/tools/`  | —                      | 311 Ko              | **271 Ko**          |
| Famille FR `/pdf/`         | 223 Ko                 | 228 Ko              | 228 Ko              |
| Guide FR                   | 167 Ko                 | 167 Ko              | 167 Ko              |
| Page légale FR / EN        | 164 Ko / —             | 166 / 212 Ko        | 166 / **172 Ko**    |

Avec le chunk de polyfills (anciens navigateurs seulement) ajouter 38 Ko à chaque valeur.

Ce qui a été fait pendant cette mission (mesurable, sans changement fonctionnel) :

1. **Messages anglais découpés** : seule la carte « chrome » (≈ 3 Ko) est enregistrée à l'hydratation
   des pages anglaises ; les cartes des outils (≈ 35 Ko gzip) sont chargées avec le composant d'outil,
   qui n'est pas rendu côté serveur. Un test (`tests/unit/i18n-messages.test.ts`) vérifie que les
   composants hydratés n'utilisent que des clés de la carte partagée. Gain : −41 Ko sur chaque page
   anglaise.
2. **Catalogue et familles rendus côté serveur** : `useSearchParams` forçait le rendu client de toute
   la liste d'outils (HTML sans aucune carte, décalage de mise en page 0,98 sur `/outils/`). Le
   paramètre `?q=` est maintenant synchronisé par un composant isolé dans sa propre limite Suspense :
   les 77 cartes du catalogue et les listes des familles sont dans le HTML (indexables), FR et EN.

Ce qui reste et pourquoi : le plancher React + exécution Next ≈ 150 Ko ; le catalogue porte le registre
(≈ 45 Ko) parce que la recherche et les filtres s'exécutent dans le navigateur ; le catalogue anglais
porte les deux registres (le registre anglais est une surcouche du français). Découper le registre par
famille ferait gagner ≈ 30 Ko sur ces deux pages seulement : non prioritaire.

## 3. Lighthouse 13.5 (Chromium headless, émulation mobile « Moto G Power » CPU ×4 et desktop)

Mesures sur le build final, machine sans autre charge (une première série lancée pendant un build
parallèle donnait des scores mobiles de 52 à 79 : écartée, car le temps de blocage dépend du CPU
disponible ; ce biais est documenté pour ne pas être reproduit).

| Page                                 | Mobile (perf / a11y / BP / SEO · métriques)               | Desktop                                                   |
| ------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| `/`                                  | 90 / 100 / 100 / 100 · LCP 3.5 s · TBT 130 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 20 ms · CLS 0     |
| `/confidentialite/`                  | 91 / 96 / 100 / 100 · LCP 2.7 s · TBT 280 ms · CLS 0      | 100 / 96 / 100 / 100 · LCP 0.7 s · TBT 10 ms · CLS 0      |
| `/en/`                               | 88 / 100 / 100 / 100 · LCP 3.6 s · TBT 170 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.8 s · TBT 10 ms · CLS 0     |
| `/en/pdf/merge/`                     | 80 / 100 / 100 / 100 · LCP 3.0 s · TBT 540 ms · CLS 0.059 | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 40 ms · CLS 0.015 |
| `/en/tools/`                         | 81 / 100 / 100 / 100 · LCP 3.8 s · TBT 340 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 0 ms · CLS 0.005  |
| `/guides/comment-fusionner-des-pdf/` | 93 / 100 / 100 / 100 · LCP 2.9 s · TBT 170 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 0 ms · CLS 0      |
| `/outils/`                           | 87 / 100 / 100 / 100 · LCP 3.2 s · TBT 290 ms · CLS 0     | 100 / 100 / 100 / 100 · LCP 0.8 s · TBT 20 ms · CLS 0     |
| `/pdf/fusionner/`                    | 80 / 100 / 100 / 100 · LCP 3.3 s · TBT 490 ms · CLS 0.025 | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 20 ms · CLS 0.017 |
| `/pdf/modifier/`                     | 71 / 100 / 100 / 100 · LCP 3.3 s · TBT 800 ms · CLS 0.103 | 100 / 100 / 100 / 100 · LCP 0.7 s · TBT 50 ms · CLS 0.033 |

Lecture :

- Accessibilité, bonnes pratiques et SEO : 100 sur toutes les pages (après deux corrections :
  contraste du badge de compteur des familles, liens des pages légales distingués par la couleur seule).
- Catalogue `/outils/` : CLS 0,98 (desktop) et 0,57 (mobile) avant correction, 0 après ; score
  desktop 75 → 100, mobile 68 → 87.
- Les scores « performance » mobiles (71–93) viennent du **temps de blocage du fil principal** sur
  un CPU ralenti ×4 : évaluation de React DOM et, sur les pages d'outils, des moteurs PDF chargés
  dès l'hydratation (pdf-lib, pdf.js). Le modificateur est le plus lourd (TBT 800 ms, CLS 0,10 à la
  limite recommandée). Aucune ressource bloquante tierce, aucune image lourde.
- Mesures d'un serveur local sans CDN ni compression Brotli ; `uses-http2` ignoré (serveur local).

## 4. Pistes mesurées mais non appliquées (arbitrage)

| Piste                                                                            | Gain attendu                                       | Pourquoi pas maintenant                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Différer le chargement du composant d'outil jusqu'à l'intersection/l'interaction | −0,3 à −0,5 s de TBT mobile sur les pages d'outils | Le dépôt de fichier est l'action principale : un délai perçu avant qu'il soit utilisable serait pire que le score |
| Découper le registre par famille pour le catalogue                               | −30 Ko sur `/outils/` et `/pdf/`                   | Deux pages seulement ; la recherche multi-familles en dépend                                                      |
| Nonce CSP pour retirer `'unsafe-inline'`                                         | sécurité, pas performance                          | impose un rendu dynamique par requête                                                                             |

## 5. Reproduire

```bash
pnpm build && pnpm start -p 3100
# JS initial des navigateurs modernes (scripts sans noModule), gzip
node /tmp/measure-modern.mjs http://127.0.0.1:3100   # script : voir ci-dessous
# Lighthouse (Chromium de Playwright)
CHROME_PATH=/opt/pw-browsers/chromium pnpm dlx lighthouse http://127.0.0.1:3100/ \
  --only-categories=performance,accessibility,best-practices,seo --output=json \
  --chrome-flags="--headless=new --no-sandbox" --output-path=./lh-home-mobile.json
# même commande avec --preset=desktop pour le bureau
```

Script de mesure (`measure-modern.mjs`) :

```js
import zlib from "node:zlib";
const base = process.argv[2];
for (const u of ["/", "/en/", "/pdf/fusionner/", "/en/pdf/merge/", "/outils/", "/en/tools/"]) {
  const html = await (await fetch(base + u)).text();
  const tags = [...html.matchAll(/<script([^>]+)>/g)]
    .map((m) => m[1])
    .filter((a) => /src="/.test(a));
  const modern = new Set(
    tags.filter((a) => !/nomodule/i.test(a)).map((a) => a.match(/src="([^"]+)"/)[1]),
  );
  let gz = 0;
  for (const s of modern)
    gz += zlib.gzipSync(Buffer.from(await (await fetch(base + s)).arrayBuffer())).length;
  console.log(u, modern.size, "scripts", (gz / 1024).toFixed(0), "KB gz");
}
```

## 6. Mise à jour du 2026-10-28 : stabilité des pages d'outils

- **Méthode** : la limitation simulée de Lighthouse (par défaut) donne des CLS instables sur les
  pages dont l'outil est chargé après coup (0,306 puis 0 sur la même page). Pour les mesures de
  stabilité, utiliser `--throttling-method=devtools` (limitation réelle), 3 passages, et retenir la
  médiane.
- **Correction** : QR code, testeur de regex et générateur d'UUID sont rendus côté serveur ; CLS
  mobile 0,326 / 0,201 / 0,079 → 0,001 / 0,002 / 0,003, outil visible à ≈ 1,2 s au lieu de ≈ 4 s,
  JavaScript initial inchangé (174 Ko FR, 179 Ko EN). Les outils « formulaire » restants réservent
  leur hauteur pendant le chargement (`src/lib/tools/workspace-heights.ts`). Détail, solutions
  écartées et compromis : `docs/RAPPORT_FINALISATION_AVEROPDF.md` §3.
- **Reste** : décalage dû au remplacement des polices web (≈ 0,02 sur toutes les pages) ; CLS du
  modificateur PDF à 0,082 en limitation réelle.
