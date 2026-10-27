import type { Metadata, Viewport } from "next";
// English texts are needed on the server for the hreflang alternates of French pages.
import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-messages";
import "@/lib/i18n/register-en-registry";
import { RootDocument } from "@/components/layout/root-document";
import { buildRootMetadata, rootViewport } from "@/lib/seo";
import "../globals.css";

export const metadata: Metadata = buildRootMetadata("fr");
export const viewport: Viewport = rootViewport;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <RootDocument locale="fr">{children}</RootDocument>;
}
