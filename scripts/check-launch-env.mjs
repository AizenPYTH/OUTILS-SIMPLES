#!/usr/bin/env node
/**
 * Launch readiness check: the public configuration a production deployment
 * must carry before the site goes live. Nothing here is invented: the script
 * only reports what is missing and exits non-zero in strict mode.
 *
 *   node scripts/check-launch-env.mjs            # report (exit 1 when something is missing)
 *   node scripts/check-launch-env.mjs --warn     # report only, always exit 0 (CI on branches)
 *
 * Reads the environment of the current process (load your deployment's
 * variables first, e.g. `vercel env pull` or `set -a; source .env.production`).
 */
const REQUIRED_LEGAL = [
  ["NEXT_PUBLIC_LEGAL_PUBLISHER_NAME", "nom ou raison sociale de l'éditeur (LCEN art. 6-III)"],
  ["NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS", "forme juridique ou « particulier »"],
  ["NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS", "adresse de l'éditeur"],
  ["NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR", "directeur de la publication"],
  ["NEXT_PUBLIC_LEGAL_CONTACT_EMAIL", "adresse de contact"],
  ["NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER", "hébergeur"],
  ["NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS", "adresse de l'hébergeur"],
];
const CONDITIONAL_LEGAL = [
  ["NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER", "SIREN/SIRET/RCS — obligatoire pour une entreprise"],
  ["NEXT_PUBLIC_LEGAL_VAT_NUMBER", "TVA intracommunautaire — si assujetti"],
];

const env = process.env;
const warnOnly = process.argv.includes("--warn");
const errors = [];
const warnings = [];

const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
if (!siteUrl) errors.push("NEXT_PUBLIC_SITE_URL absente (canonical, sitemap, robots, Open Graph).");
else {
  let parsed = null;
  try {
    parsed = new URL(siteUrl);
  } catch {
    errors.push(`NEXT_PUBLIC_SITE_URL invalide : « ${siteUrl} ».`);
  }
  if (parsed) {
    if (parsed.protocol !== "https:")
      errors.push(
        "NEXT_PUBLIC_SITE_URL doit être en https (la caméra du scanner est refusée en http).",
      );
    if (/localhost|127\.0\.0\.1|example\.(invalid|com)|\.local$/.test(parsed.hostname))
      errors.push(`NEXT_PUBLIC_SITE_URL pointe vers une adresse de test : ${parsed.hostname}.`);
    if (siteUrl.endsWith("/"))
      warnings.push(
        "NEXT_PUBLIC_SITE_URL se termine par « / » : la barre finale est retirée automatiquement.",
      );
  }
}
for (const [name, label] of REQUIRED_LEGAL) {
  const value = (env[name] ?? "").trim();
  if (!value) errors.push(`${name} absente : ${label}.`);
  else if (
    /^(à compléter|todo|xxx+|exemple|example|n\/a|-)$/i.test(value) ||
    /à compléter/i.test(value)
  )
    errors.push(`${name} contient une valeur de remplissage : « ${value} ».`);
}
if (
  (env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? "").trim() &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL.trim())
) {
  errors.push("NEXT_PUBLIC_LEGAL_CONTACT_EMAIL n'est pas une adresse e-mail valide.");
}
for (const [name, label] of CONDITIONAL_LEGAL) {
  if (!(env[name] ?? "").trim()) warnings.push(`${name} vide : ${label}.`);
}

const analytics = env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "none";
if (analytics === "plausible" && !(env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "").trim())
  errors.push("Plausible activé sans NEXT_PUBLIC_PLAUSIBLE_DOMAIN.");
if (analytics === "gtag" && !(env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim())
  errors.push("Google Analytics activé sans NEXT_PUBLIC_GA_MEASUREMENT_ID.");
if (env.NEXT_PUBLIC_ADS_ENABLED === "true") {
  if (!(env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim())
    errors.push("Publicité activée sans NEXT_PUBLIC_ADSENSE_CLIENT.");
  warnings.push(
    "Publicité activée : relire /confidentialite/ et /gestion-cookies/ (et leurs versions /en/) avant publication.",
  );
}

const header = `Contrôle de mise en ligne (${new Date().toISOString().slice(0, 10)})`;
console.log(header);
console.log("-".repeat(header.length));
if (errors.length === 0)
  console.log(
    "✔ Configuration publique complète : identité légale, adresse du site, services tiers cohérents.",
  );
for (const e of errors) console.log(`✖ ${e}`);
for (const w of warnings) console.log(`⚠ ${w}`);
console.log(`\n${errors.length} bloquant(s), ${warnings.length} avertissement(s).`);
if (errors.length && !warnOnly) process.exit(1);
