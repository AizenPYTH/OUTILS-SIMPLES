import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-messages";
import "@/lib/i18n/register-en-registry";
import { ogImage, OG_FOOTER_EN } from "@/lib/og";
import { getPublishedTools } from "@/lib/tools";

/** Generic English share image at a stable URL, used by the pages without their own. */
export const dynamic = "force-static";

export function GET() {
  return ogImage({
    title: "Every tool for your PDFs and files",
    subtitle: `${getPublishedTools("en").length} free tools for your PDFs, images, scans and text, with no upload and no account.`,
    footer: OG_FOOTER_EN,
  });
}
