import { ogImage } from "@/lib/og";
import { getPublishedTools } from "@/lib/tools";

/** Generic French share image at a stable URL, used by the pages without their own. */
export const dynamic = "force-static";

export function GET() {
  return ogImage({
    title: "Vos fichiers, vos outils, votre navigateur.",
    subtitle: `${getPublishedTools("fr").length} outils gratuits pour vos PDF, images, numérisation et texte, sans envoi ni compte.`,
  });
}
