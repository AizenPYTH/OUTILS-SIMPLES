# Lancement public d'AVEROPDF sans publicité (Vercel, averopdf.com)

Préparé le 28 octobre 2026 pour une première mise en ligne par un particulier (étudiant, sans
entreprise), **sans publicité ni mesure d'audience**. Ce document ne constitue pas un conseil
juridique : les points marqués « à vérifier » doivent l'être avant publication. **Rien n'a été
déployé ; aucune configuration externe (DNS, Vercel, messagerie) n'a été modifiée.**

## 1. Domaine et adresse de contact

| Point                         | Constat                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domaine dans le code          | Aucun domaine n'est écrit dans le code du site : canonical, hreflang, sitemap, `robots.txt`, Open Graph et données structurées utilisent `NEXT_PUBLIC_SITE_URL`. Avec `https://averopdf.com`, toutes les URL publiques seront en `.com` (vérifié sur un build de test). |
| Domaine `averopdf.com`        | **Non vérifié** : ni l'enregistrement du domaine, ni ses DNS, ni son rattachement à Vercel n'ont pu être contrôlés depuis l'environnement de travail.                                                                                                                   |
| Adresse `contagt@averopdf.fr` | Deux différences à confirmer : « contagt » (et non « contact ») et le domaine `.fr` alors que le site est en `.com`. Elle n'a été inscrite nulle part. **Non vérifié** : existence de la boîte, possession de `averopdf.fr`, réception des messages.                    |
| Occurrences `averopdf.fr`     | Uniquement dans des données de test (fixtures, tests unitaires) : sans effet sur le site.                                                                                                                                                                               |

## 2. Variables à saisir dans Vercel (jamais dans le dépôt)

Vercel → projet → Settings → Environment Variables. **Production** et **Preview** séparément.

| Variable                                                    | Production                                                                                                                  | Preview              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `NEXT_PUBLIC_SITE_URL`                                      | `https://averopdf.com` (choisir aussi entre `averopdf.com` et `www.averopdf.com`, l'autre redirigeant vers lui dans Vercel) | facultatif           |
| `NEXT_PUBLIC_NOINDEX`                                       | absente                                                                                                                     | `true` (obligatoire) |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_KIND`                          | `individual` ou `anonymous` (§3) — pas `company` sans entreprise                                                            | idem ou vide         |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_NAME`                          | vos nom et prénom (`individual`)                                                                                            | —                    |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS`                       | l'adresse que vous choisissez de publier (`individual`, §3)                                                                 | —                    |
| `NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS`                        | facultatif, par exemple « à titre non professionnel »                                                                       | —                    |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`                           | l'adresse confirmée (§1)                                                                                                    | —                    |
| `NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER`                        | `Vercel Inc.`                                                                                                               | —                    |
| `NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS`                         | à recopier depuis la page officielle de Vercel (§4)                                                                         | —                    |
| `NEXT_PUBLIC_LEGAL_HOSTING_PHONE`                           | à relever sur une page officielle de Vercel (§4) ; requis en mode `individual`                                              | —                    |
| `NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER`, `_VAT_NUMBER`      | **vides** (aucune entreprise)                                                                                               | vides                |
| `NEXT_PUBLIC_ADS_ENABLED`, `NEXT_PUBLIC_ANALYTICS_PROVIDER` | absentes (publicité et mesure d'audience désactivées)                                                                       | absentes             |

Commande de build (Settings → Build and Deployment) : `pnpm check:launch && pnpm build`. Sur une
prévisualisation Vercel (`VERCEL_ENV=preview`), le contrôle exige `NEXT_PUBLIC_NOINDEX=true` et
ne fait qu'avertir pour l'identité ; en production, tout manque bloque le build. Ne pas
contourner ce contrôle avec des valeurs fictives.

## 3. Identité de l'éditeur : deux options à trancher

Texte applicable : loi n° 2004-575 du 21 juin 2004 (LCEN), **article 1-1** (numérotation issue de
la loi n° 2024-449 du 21 mai 2024 « SREN » ; beaucoup de modèles en ligne citent encore l'ancien
article 6, III). Version en vigueur à relire sur Légifrance :
<https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614> (non consultable depuis
l'environnement de travail ; contenu connu par recherche, à confirmer).

| Option                     | Ce qui est publié                                                                                                            | Conditions à vérifier                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `individual` (art. 1-1, I) | nom, prénom, adresse de l'éditeur, contact, directeur de la publication (vous), hébergeur avec nom, adresse **et téléphone** | L'adresse publiée est visible de tous : vérifier quelle adresse il est possible et prudent d'indiquer (domicile, adresse de correspondance ou de domiciliation) — question à poser à un juriste, aucune adresse ne doit être inventée.                                                                                                                                                                                |
| `anonymous` (art. 1-1, II) | mention d'un éditeur non professionnel anonyme, contact, hébergeur (nom et adresse)                                          | (1) l'édition doit être **non professionnelle** : sans publicité, sans revenu ; (2) vos éléments d'identification doivent avoir été **réellement communiqués à l'hébergeur** — vérifier que les informations de votre compte Vercel suffisent au sens de la loi ; (3) concilier l'anonymat avec l'obligation RGPD d'identifier le responsable du traitement (art. 13) ; (4) à abandonner si la publicité est activée. |

Le site ne se présente jamais comme une entreprise : en mode `individual` et `anonymous`, aucune
mention de siège, de forme sociale, de SIREN ni de TVA n'apparaît (sauf si une valeur est saisie).
Si une micro-entreprise est créée (par exemple avant d'activer la publicité), passer à `company`
et renseigner l'immatriculation.

## 4. Hébergeur Vercel (sources officielles, via recherche)

Les pages de Vercel n'ont pas pu être ouvertes directement depuis l'environnement de travail ;
les éléments ci-dessous proviennent de résultats de recherche limités au domaine `vercel.com`.
**À recopier vous-même depuis les pages officielles**, jamais depuis ce document :

- Adresse : la Privacy Notice de Vercel (<https://vercel.com/legal/privacy-notice>) indique
  « Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States ». Un ancien
  accord de traitement mentionne une autre adresse (Walnut, CA) : se fier à la page en vigueur.
- Téléphone : aucun numéro sur la Privacy Notice. Un numéro figure sur l'ancienne page DMCA
  (<https://vercel.com/legal/dmca-policy>) ; vérifier qu'il est toujours publié, ou demander à
  Vercel le numéro à indiquer. Requis par l'article 1-1, I, 4° en mode `individual`.
- Transferts hors UE : Vercel déclare être certifié au Data Privacy Framework UE–États-Unis et
  prévoit des clauses contractuelles types dans son DPA (<https://vercel.com/legal/dpa>) ; à
  vérifier sur <https://www.dataprivacyframework.gov/list>.
- Journaux : la documentation indique une rétention des « runtime logs » d'une heure sur le plan
  Hobby ; Vercel traite aussi, comme tout hébergeur, les données techniques des requêtes (adresse
  IP, date, URL, navigateur) selon sa Privacy Notice. Le site étant statique, il n'émet pas de
  journaux applicatifs propres.
- **Plan Hobby (gratuit) : réservé à un usage personnel non commercial** selon les conditions de
  Vercel ; la publicité (AdSense) y est citée comme usage commercial. Le lancement sans publicité
  est compatible avec Hobby ; toute monétisation imposera le plan Pro (à vérifier au moment voulu).
- Prévisualisations : vérifier dans Settings → Deployment Protection qu'elles sont protégées, en
  plus de `NEXT_PUBLIC_NOINDEX=true`.

## 5. Données traitées (vérifié dans le code le 2026-10-28)

- 69 outils, tous `processing: "client"` : le fichier est lu et transformé dans le navigateur ; un
  fichier déposé sur l'accueil passe à l'outil choisi en mémoire uniquement.
- Requêtes réseau du code : uniquement des fichiers du site (moteur HEIC, polices, liste hors
  ligne, moteur et modèles OCR, code `/_next`). CSP `connect-src 'self'`. Parcours des 138 pages
  d'outils FR/EN : aucune requête vers un autre domaine.
- Stockage sur l'appareil : thème et consentement (localStorage), copies des pages et fichiers du
  site (Cache Storage du service worker), modèles de langue OCR (IndexedDB). Aucun cookie, aucun
  identifiant, aucun contenu de document.
- Hébergeur : données techniques de requête (§4). Contact : e-mails reçus (boîte de l'éditeur).
- Ces points sont décrits sur `/confidentialite/`, `/gestion-cookies/` et leurs versions `/en/`.

## 6. Statistiques : Vercel Web Analytics (non activé)

État : **non configuré** (le paquet `@vercel/analytics` n'est pas installé ; l'activer dans le
tableau de bord Vercel seul ne collecte rien). Rien n'a été ajouté.

Selon la documentation de Vercel (<https://vercel.com/docs/analytics/privacy-policy>) :
pas de cookie tiers ; visiteur reconnu par une empreinte calculée à partir de la requête,
réinitialisée chaque jour ; données par page vue : URL, référent, paramètres filtrés, type
d'appareil, système, navigateur, pays/région/ville déduits de l'adresse IP ; données agrégées.
Points restant à établir : stockage éventuel dans le navigateur, durée de conservation, lieu de
traitement (États-Unis).

Consentement en France (CNIL, article 82 de la loi Informatique et Libertés) : une mesure
d'audience peut être exemptée de consentement si sa finalité se limite à des statistiques
anonymes pour le seul compte de l'éditeur, sans recoupement ni transmission à des tiers ni
réutilisation par le prestataire, avec information des visiteurs, droit d'opposition et
conservation limitée (25 mois au plus). Vercel Web Analytics ne figure pas, à notre connaissance,
parmi les solutions examinées par la CNIL (programme désormais terminé ; liste à vérifier) :
l'exemption n'est pas acquise, il faut l'analyser (outil d'auto-évaluation de la CNIL) ou, à
défaut, recueillir le consentement. Sources :
<https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience>,
<https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ>.

Avantages : intégré à l'hébergeur, sans cookie tiers, données agrégées. Inconvénients : données
traitées par un prestataire établi aux États-Unis, exemption de consentement non garantie,
limites d'usage selon le plan (à vérifier sur la page de tarifs de Vercel). **Décision à prendre par vous** ; en cas d'accord, il faudra installer le
composant, mettre à jour la politique de confidentialité et la CSP, puis prévoir l'opposition ou
le consentement selon l'analyse.

## 7. Publicité

Désactivée : `NEXT_PUBLIC_ADS_ENABLED` absente → aucun script AdSense, aucune requête
publicitaire, aucun emplacement rendu (pas même vide), aucun bandeau de consentement (aucun
service tiers à consentir). Vérifié : 0 code publicitaire dans les pages générées. Les textes du
site (FAQ de l'accueil, confidentialité, affiliation) indiquent qu'aucune publicité n'est
affichée et basculeraient automatiquement si elle était activée. L'infrastructure reste dans le
code pour plus tard (`docs/MONETISATION_PUBLICITAIRE.md`), avec ses garde-fous dans
`pnpm check:launch`.
