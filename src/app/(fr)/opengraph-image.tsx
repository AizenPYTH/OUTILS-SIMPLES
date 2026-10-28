import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { siteConfig } from "@/config/site";
import { getPublishedTools } from "@/lib/tools";

export const alt = `${siteConfig.name} – ${siteConfig.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    title: "Tous les outils pour vos PDF et vos fichiers",
    subtitle: `${getPublishedTools().length} outils gratuits pour vos PDF, images, numérisation et texte, sans envoi ni compte.`,
  });
}
