import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-messages";
import "@/lib/i18n/register-en-registry";
import "@/lib/i18n/register-en-registry";
import { ogImage, OG_CONTENT_TYPE, OG_FOOTER_EN, OG_SIZE } from "@/lib/og";
import { siteConfig } from "@/config/site";
import { getPublishedTools } from "@/lib/tools";

export const alt = `${siteConfig.name} – Simple, fast and private online tools`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    title: "Your files, your tools, your browser.",
    subtitle: `${getPublishedTools("en").length} free tools for your PDFs, images, scans and text, with no upload and no account.`,
    footer: OG_FOOTER_EN,
  });
}
