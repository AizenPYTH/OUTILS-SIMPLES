/**
 * Central brand & site configuration. Change the name, domain, colors and
 * legal placeholders here; nothing else in the codebase should hard-code them.
 */
import { publicEnv } from "@/config/env";

export const siteConfig = {
  name: "AVEROPDF",
  /** Short tagline shown in the header/footer and default title template. */
  tagline: "Outils en ligne simples, rapides et privés",
  /** Default meta description for the home page. */
  description:
    "AVEROPDF regroupe des outils en ligne gratuits pour vos PDF : fusionner, diviser, compresser, organiser, annoter, signer et ajouter un filigrane. Les fichiers sont traités dans votre navigateur et ne sont jamais envoyés sur un serveur.",
  /** Canonical origin, without trailing slash. */
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  locale: "fr-FR",
  language: "fr",
  /** Languages prepared for a future release; only `fr` is published today. */
  supportedLanguages: [{ code: "fr", label: "Français", published: true }] as const,
  /** Twitter/X handle without "@", left empty until the owner supplies it. */
  twitterHandle: "",
  /**
   * Publisher identity: MUST be completed by the site owner before launch.
   * These values come from the NEXT_PUBLIC_LEGAL_* environment variables (see
   * .env.example and docs/MISE_EN_LIGNE.md) and are rendered on the legal pages
   * with an explicit "à compléter" marker when left empty — nothing is invented.
   */
  legal: {
    publisherName: publicEnv.NEXT_PUBLIC_LEGAL_PUBLISHER_NAME,
    publisherStatus: publicEnv.NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS,
    publisherAddress: publicEnv.NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS,
    registrationNumber: publicEnv.NEXT_PUBLIC_LEGAL_REGISTRATION_NUMBER,
    vatNumber: publicEnv.NEXT_PUBLIC_LEGAL_VAT_NUMBER,
    publicationDirector: publicEnv.NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR,
    contactEmail: publicEnv.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL,
    hostingProvider: publicEnv.NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER,
    hostingAddress: publicEnv.NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS,
  },
  /** Repository URL shown nowhere publicly by default. */
  links: {
    github: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalized}`;
}
