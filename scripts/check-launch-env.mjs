#!/usr/bin/env node
/**
 * Launch readiness check: the public configuration a production deployment
 * must carry before the site goes live. Nothing here is invented: the script
 * only reports what is missing and exits non-zero in strict mode.
 *
 *   node scripts/check-launch-env.mjs            # report (exit 1 when something is missing)
 *   node scripts/check-launch-env.mjs --warn     # report only, always exit 0 (CI on branches)
 *
 * On a Vercel preview build (VERCEL_ENV=preview) the identity and address checks
 * only warn, but NEXT_PUBLIC_NOINDEX=true becomes mandatory: the same build
 * command (`pnpm check:launch && pnpm build`) then serves both environments.
 *
 * Reads the environment of the current process (load your deployment's
 * variables first, e.g. `vercel env pull` or `set -a; source .env.production`).
 */
/**
 * Legal identity required for each kind of publisher (NEXT_PUBLIC_LEGAL_PUBLISHER_KIND).
 * LCEN art. 1-1 (loi n° 2004-575, renumbered by loi n° 2024-449 « SREN ») : I for
 * identified publishers (including the host's name, address and telephone number),
 * II for non-professional publishers keeping their anonymity.
 */
const COMMON_LEGAL = [
  ["NEXT_PUBLIC_LEGAL_CONTACT_EMAIL", "adresse de contact (pages Contact et Confidentialité)"],
  ["NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER", "nom de l'hébergeur"],
  ["NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS", "adresse de l'hébergeur"],
];
const LEGAL_BY_KIND = {
  individual: [
    ["NEXT_PUBLIC_LEGAL_PUBLISHER_NAME", "nom et prénom de l'éditeur (LCEN art. 1-1, I)"],
    ["NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS", "adresse de l'éditeur (LCEN art. 1-1, I)"],
    ["NEXT_PUBLIC_LEGAL_HOSTING_PHONE", "téléphone de l'hébergeur (LCEN art. 1-1, I, 4°)"],
  ],
  company: [
    ["NEXT_PUBLIC_LEGAL_PUBLISHER_NAME", "raison sociale de l'éditeur"],
    ["NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS", "forme juridique"],
    ["NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS", "adresse du siège"],
    ["NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER", "numéro d'immatriculation (SIREN/RCS)"],
    ["NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR", "directeur de la publication"],
    ["NEXT_PUBLIC_LEGAL_HOSTING_PHONE", "téléphone de l'hébergeur (LCEN art. 1-1, I, 4°)"],
  ],
  anonymous: [],
};

const env = process.env;
const warnOnly = process.argv.includes("--warn");
// Vercel sets VERCEL_ENV during its builds: a preview is not the public site.
const preview = env.VERCEL_ENV === "preview";
const errors = [];
const warnings = [];
/** Problems that block the public site but only warn on a non-indexed preview. */
const launchIssue = (message) =>
  preview ? warnings.push(`(prévisualisation) ${message}`) : errors.push(message);

if (preview) {
  if (env.NEXT_PUBLIC_NOINDEX !== "true")
    errors.push(
      "Prévisualisation Vercel sans NEXT_PUBLIC_NOINDEX=true : elle pourrait être indexée.",
    );
} else if (env.NEXT_PUBLIC_NOINDEX === "true")
  errors.push(
    "NEXT_PUBLIC_NOINDEX=true : réservé aux prévisualisations, le site de production serait invisible des moteurs.",
  );
const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
if (!siteUrl) launchIssue("NEXT_PUBLIC_SITE_URL absente (canonical, sitemap, robots, Open Graph).");
else {
  let parsed = null;
  try {
    parsed = new URL(siteUrl);
  } catch {
    errors.push(`NEXT_PUBLIC_SITE_URL invalide : « ${siteUrl} ».`);
  }
  if (parsed) {
    if (parsed.protocol !== "https:")
      launchIssue(
        "NEXT_PUBLIC_SITE_URL doit être en https (la caméra du scanner est refusée en http).",
      );
    // Reserved documentation and test names (RFC 2606 / 6761) are never a public address.
    if (
      /localhost|127\.0\.0\.1|(^|\.)example\.(com|org|net)$|\.(local|test|invalid|example|localhost)$/.test(
        parsed.hostname,
      )
    )
      launchIssue(`NEXT_PUBLIC_SITE_URL pointe vers une adresse de test : ${parsed.hostname}.`);
    if (siteUrl.endsWith("/"))
      warnings.push(
        "NEXT_PUBLIC_SITE_URL se termine par « / » : la barre finale est retirée automatiquement.",
      );
  }
}

const filled = (name) => (env[name] ?? "").trim();
const kind = filled("NEXT_PUBLIC_LEGAL_PUBLISHER_KIND");
if (!kind)
  launchIssue(
    "NEXT_PUBLIC_LEGAL_PUBLISHER_KIND absente : individual (particulier identifié), company (entreprise) ou anonymous (particulier non professionnel, identité confiée à l'hébergeur — à valider juridiquement).",
  );
else if (!(kind in LEGAL_BY_KIND))
  errors.push(
    `NEXT_PUBLIC_LEGAL_PUBLISHER_KIND invalide : « ${kind} » (individual, company ou anonymous).`,
  );
for (const [name, label] of [...COMMON_LEGAL, ...(LEGAL_BY_KIND[kind] ?? [])]) {
  if (!filled(name)) launchIssue(`${name} absente : ${label}.`);
}
for (const name of Object.keys(env).filter((k) => k.startsWith("NEXT_PUBLIC_LEGAL_"))) {
  const value = filled(name);
  if (value && (/^(todo|xxx+|exemple|example|n\/a|-)$/i.test(value) || /à compléter/i.test(value)))
    launchIssue(`${name} contient une valeur de remplissage : « ${value} ».`);
}
if (
  filled("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL") &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(filled("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL"))
) {
  errors.push("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL n'est pas une adresse e-mail valide.");
}
if (kind === "company" && !filled("NEXT_PUBLIC_LEGAL_VAT_NUMBER"))
  warnings.push("NEXT_PUBLIC_LEGAL_VAT_NUMBER vide : TVA intracommunautaire — si assujetti.");
if (kind === "individual" && filled("NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER"))
  warnings.push(
    "Numéro d'immatriculation renseigné pour un particulier : si une entreprise (ou micro-entreprise) existe, choisir NEXT_PUBLIC_LEGAL_PUBLISHER_KIND=company.",
  );
if (kind === "anonymous") {
  warnings.push(
    "Éditeur anonyme (LCEN art. 1-1, II) : à confirmer avant publication — édition à titre non professionnel, éléments d'identification effectivement communiqués à l'hébergeur, et information RGPD sur le responsable du traitement.",
  );
  if (filled("NEXT_PUBLIC_LEGAL_PUBLISHER_NAME") || filled("NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS"))
    warnings.push(
      "Éditeur anonyme : NEXT_PUBLIC_LEGAL_PUBLISHER_NAME et _ADDRESS ne sont pas affichés dans ce mode.",
    );
  if (env.NEXT_PUBLIC_ADS_ENABLED === "true")
    errors.push(
      "Publicité activée avec un éditeur anonyme : l'anonymat n'est ouvert qu'à l'édition non professionnelle ; une activité rémunérée exige une identification complète (à vérifier juridiquement).",
    );
}

const analytics = env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "none";
if (analytics === "plausible" && !(env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "").trim())
  errors.push("Plausible activé sans NEXT_PUBLIC_PLAUSIBLE_DOMAIN.");
if (analytics === "gtag" && !(env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim())
  errors.push("Google Analytics activé sans NEXT_PUBLIC_GA_MEASUREMENT_ID.");
if (env.NEXT_PUBLIC_ADS_PREVIEW === "true")
  warnings.push(
    "NEXT_PUBLIC_ADS_PREVIEW=true : sans effet en production, mais à retirer de la configuration.",
  );
if (env.NEXT_PUBLIC_ADS_ENABLED === "true") {
  if ((env.NEXT_PUBLIC_ADS_PROVIDER ?? "none") === "none")
    errors.push("Publicité activée sans NEXT_PUBLIC_ADS_PROVIDER (adsense).");
  if (!(env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim())
    errors.push("Publicité activée sans NEXT_PUBLIC_ADSENSE_CLIENT.");
  else if (!/^ca-pub-\d{10,20}$/.test(env.NEXT_PUBLIC_ADSENSE_CLIENT.trim()))
    errors.push("NEXT_PUBLIC_ADSENSE_CLIENT n'a pas le format attendu (ca-pub-<chiffres>).");
  const slots = Object.keys(env).filter(
    (k) => k.startsWith("NEXT_PUBLIC_ADSENSE_SLOT_") && (env[k] ?? "").trim(),
  );
  if (slots.length === 0)
    errors.push(
      "Publicité activée mais aucun emplacement n'a d'identifiant de bloc (NEXT_PUBLIC_ADSENSE_SLOT_*).",
    );
  if ((env.NEXT_PUBLIC_CONSENT_MODE ?? "builtin") !== "external")
    errors.push(
      "Publicité activée avec la bannière maison (NEXT_PUBLIC_CONSENT_MODE=builtin) : une plateforme de consentement certifiée est requise pour le trafic EEE/Royaume-Uni/Suisse (NEXT_PUBLIC_CONSENT_MODE=external).",
    );
  warnings.push(
    "Publicité activée : relire /confidentialite/ et /gestion-cookies/ (et leurs versions /en/) avant publication.",
  );
}

const header = `Contrôle de mise en ligne (${new Date().toISOString().slice(0, 10)})`;
console.log(header);
console.log("-".repeat(header.length));
if (errors.length === 0)
  console.log(
    preview
      ? "✔ Prévisualisation non indexable (les manques ci-dessous bloqueraient la production)."
      : "✔ Configuration publique complète : identité légale, adresse du site, services tiers cohérents.",
  );
for (const e of errors) console.log(`✖ ${e}`);
for (const w of warnings) console.log(`⚠ ${w}`);
console.log(`\n${errors.length} bloquant(s), ${warnings.length} avertissement(s).`);
if (errors.length && !warnOnly) process.exit(1);
