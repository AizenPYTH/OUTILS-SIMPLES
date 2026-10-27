# Audit de performance

Date : 2026-10-27. Build de production (`next build`, Turbopack), serveur `next start` local, mesures
reproductibles avec les scripts décrits en § 4. **Lighthouse n'a pas pu être exécuté** dans cet
environnement (installation de `lighthouse` via `npx` refusée par le réseau du conteneur) : les Core
Web Vitals de terrain restent à mesurer après mise en ligne (Search Console, PageSpeed Insights).

## 1. JavaScript initial (scripts référencés par le HTML, gzip)

| Page                                                 | Avant la version anglaise (rapport précédent) | Français, après | Anglais, après |
| ---------------------------------------------------- | --------------------------------------------- | --------------- | -------------- |
| Accueil                                              | 183 Ko                                        | 221 Ko          | 266 Ko         |
| Page d'outil (fusionner / merge)                     | 176 Ko                                        | 214 Ko          | 259 Ko         |
| Modificateur PDF (page, avant chargement de l'outil) | —                                             | 214 Ko          | 259 Ko         |
| Guide                                                | 167 Ko (page de contenu)                      | 208 Ko          | 253 Ko         |
| Catalogue                                            | —                                             | 266 Ko          | 349 Ko         |

Lecture :

- Le plancher React + exécution Next + polyfills (≈ 150 Ko) est inchangé. L'écart français
  « avant/après » (≈ +40 Ko) correspond au gabarit devenu bilingue : fournisseur de locale,
  table des routes, sélecteur de langue, formats de nombres par langue et le code `tr()`
  des composants partagés. Il a été réduit de 265 Ko à 221 Ko pendant cette mission en retirant
  les cartes de traduction anglaises du bundle français (voir § 3).
- Les pages anglaises portent en plus le dictionnaire et les messages anglais (≈ 45 Ko gzip),
  nécessaires à l'hydratation ; le registre anglais (≈ 80 Ko gzip avec le registre français
  dont il dépend) n'est téléchargé que par le catalogue/familles anglais et au chargement d'un
  composant d'outil.
- Les moteurs (pdf.js 4,7 Mo, OCR 17 Mo, polices 4,2 Mo, HEIC 1,5 Mo) ne sont chargés qu'à l'usage,
  comme avant.

## 2. Autres mesures

| Mesure          | Valeur                                                                                           | Commentaire                                            |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| CSS             | 16 Ko gzip, une feuille                                                                          | Tailwind 4, inchangé                                   |
| HTML accueil    | 39 Ko gzip (FR) / 37 Ko (EN)                                                                     | contient la charge utile RSC                           |
| Pages statiques | accueil, catalogue, familles, 69 × 2 pages d'outils, guides, pages légales dans les deux langues | prérendues au build (`○`/`●` dans le journal de build) |
| Images OG       | générées au build par route, FR et EN                                                            | `opengraph-image` par page                             |
| Service worker  | version par build, précache de `/hors-ligne/` et `/en/offline/`                                  | aucune mise en cache de ressource tierce               |

## 3. Correctifs appliqués pendant la mission

1. Les cartes de messages anglais (`src/lib/i18n/messages/en`, ≈ 120 Ko bruts) étaient importées par
   les composants partagés : elles arrivaient sur toutes les pages françaises (+ 41 Ko gzip). Elles sont
   désormais enregistrées par la racine `/en/` (`register-en.ts` + `EnglishBundle`).
2. Le registre anglais était importé statiquement par les requêtes du registre : il arrivait avec le
   registre français sur le catalogue (+ 37 Ko gzip, FR et EN). Il est désormais enregistré par les
   pages anglaises qui en ont besoin et chargé à la demande avant un composant d'outil.
3. Le dictionnaire anglais complet était embarqué dans le bundle français : enregistré par la racine
   `/en/` uniquement.

## 4. Reproduire

```bash
pnpm build && pnpm start -p 3100
# scripts référencés par le HTML, taille gzip (Node 22)
node -e '
const zlib=require("zlib");(async()=>{for(const u of ["/","/en/","/pdf/fusionner/","/en/pdf/merge/","/outils/","/en/tools/"]){
const html=await (await fetch("http://127.0.0.1:3100"+u)).text();
const srcs=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]))];let gz=0;
for(const s of srcs){const b=Buffer.from(await (await fetch("http://127.0.0.1:3100"+s)).arrayBuffer());gz+=zlib.gzipSync(b).length;}
console.log(u,srcs.length,"scripts",(gz/1024).toFixed(0),"Ko gz");}})()'
```

## 5. Pistes non réalisées (à arbitrer)

- Un nonce CSP permettrait de retirer `'unsafe-inline'` mais impose un rendu dynamique : écarté
  (voir `docs/AUDIT_SECURITE_ET_CONFIDENTIALITE.md`).
- Réduire encore le gabarit (≈ 60 Ko hors plancher) demanderait de découper le dictionnaire par page ;
  gain estimé < 10 Ko gzip, non prioritaire.
- Mesure Lighthouse/Web Vitals : à faire sur l'URL de prévisualisation (`docs/PLAN_LANCEMENT.md`).
