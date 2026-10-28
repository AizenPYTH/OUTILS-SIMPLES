import { siteConfig } from "@/config/site";

export type PublisherKind = "individual" | "company" | "anonymous";
type Legal = typeof siteConfig.legal;
type LegalField = Exclude<keyof Legal, "publisherKind">;

/**
 * Information each kind of publisher must publish (LCEN art. 1-1, loi n° 2004-575
 * as renumbered by loi n° 2024-449). Mirrors scripts/check-launch-env.mjs, which
 * blocks a production build when one is missing.
 */
const REQUIRED: Record<PublisherKind, LegalField[]> = {
  individual: [
    "publisherName",
    "publisherAddress",
    "contactEmail",
    "hostingProvider",
    "hostingAddress",
    "hostingPhone",
  ],
  company: [
    "publisherName",
    "publisherStatus",
    "publisherAddress",
    "registrationNumber",
    "publicationDirector",
    "contactEmail",
    "hostingProvider",
    "hostingAddress",
    "hostingPhone",
  ],
  anonymous: ["contactEmail", "hostingProvider", "hostingAddress"],
};

/** The kind used for the wording: a private person until the owner says otherwise. */
export function publisherKind(legal: Legal = siteConfig.legal): PublisherKind {
  return legal.publisherKind || "individual";
}

/** True while the owner has not chosen a kind or a required value is empty. */
export function isLegalIdentityIncomplete(legal: Legal = siteConfig.legal): boolean {
  if (!legal.publisherKind) return true;
  return REQUIRED[legal.publisherKind].some((field) => !legal[field].trim());
}
