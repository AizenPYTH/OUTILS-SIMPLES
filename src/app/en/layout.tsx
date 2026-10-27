import type { Metadata, Viewport } from "next";
import "@/lib/i18n/register-en";
import "@/lib/i18n/register-en-registry";
import { EnglishBundle } from "@/components/providers/english-bundle";
import { RootDocument } from "@/components/layout/root-document";
import { buildRootMetadata, rootViewport } from "@/lib/seo";
import "../globals.css";

export const metadata: Metadata = buildRootMetadata("en");
export const viewport: Viewport = rootViewport;

export default function EnglishRootLayout({ children }: LayoutProps<"/en">) {
  return (
    <RootDocument locale="en">
      <EnglishBundle />
      {children}
    </RootDocument>
  );
}
