/**
 * Central brand & site configuration. Change the name, domain, colors and
 * legal placeholders here; nothing else in the codebase should hard-code them.
 */
import { publicEnv } from "@/config/env";

export const siteConfig = {
  name: "OUTILIA",
  /** Short tagline shown in the header/footer and default title template. */
  tagline: "Outils en ligne simples, rapides et privés",
  /** Default meta description for the home page. */
  description:
    "OUTILIA regroupe des outils en ligne gratuits pour vos PDF : fusionner, diviser, compresser, organiser, annoter, signer et ajouter un filigrane. Les fichiers sont traités dans votre navigateur et ne sont jamais envoyés sur un serveur.",
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
   * These values are rendered on the legal pages with an explicit "à compléter"
   * marker when left empty — nothing is invented.
   */
  legal: {
    publisherName: "",
    publisherStatus: "",
    publisherAddress: "",
    registrationNumber: "",
    vatNumber: "",
    publicationDirector: "",
    contactEmail: "",
    hostingProvider: "",
    hostingAddress: "",
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
