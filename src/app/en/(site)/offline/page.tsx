import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { OfflineToolList } from "@/components/offline/offline-tool-list";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedTools, getToolPath } from "@/lib/tools";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return {
    ...buildPageMetadata({
      title: "Offline",
      description: `Use the ${siteConfig.name} tools without an internet connection: what works, what does not, and how to save a tool on this device.`,
      path: "/en/offline/",
      locale: "en",
    }),
    robots: { index: false, follow: true },
  };
}

/** Served by the service worker when a page is requested offline and is not cached. */
export default function OfflinePage() {
  setRequestLocale("en");
  const names = Object.fromEntries(
    getPublishedTools("en").map((tool) => [getToolPath(tool, "en"), tool.name]),
  );
  const icons = Object.fromEntries(
    getPublishedTools("en").map((tool) => [
      getToolPath(tool, "en"),
      { icon: tool.icon, category: tool.category },
    ]),
  );
  return (
    <LegalPage
      title="Offline"
      path="/en/offline/"
      intro="The tools run entirely in your browser: once saved on this device, they no longer need the internet."
    >
      <section>
        <h2>Tools saved on this device</h2>
        <OfflineToolList names={names} icons={icons} />
      </section>
      <section>
        <h2>How to save a tool</h2>
        <p>
          Open the tool&apos;s page while connected and press “Use offline” below the work area. The
          page, its scripts and the engines it needs (PDF rendering, text recognition, fonts) are
          then stored by your browser. The download size is shown before you confirm.
        </p>
        <p>
          Every page you visit is also kept automatically for a while, but only explicit saving
          guarantees that the heavy engines are present.
        </p>
      </section>
      <section>
        <h2>What does not work without a connection</h2>
        <ul>
          <li>The first visit: the site must be loaded at least once online.</li>
          <li>Tools that were never saved nor opened on this device.</li>
          <li>
            English text recognition if it was never used online on this device (only the French
            model is saved with the OCR tool).
          </li>
          <li>
            PDFs using Asian fonts (mapping tables loaded on demand) and editor fonts other than
            Liberation if never used online.
          </li>
          <li>Site updates, applied on the next connected visit.</li>
        </ul>
        <p>
          The browser may delete these files when it runs out of space, in private browsing, or
          after a long period without a visit (Safari limits how long they are kept). Nothing is
          stored anywhere but on your device.
        </p>
      </section>
      <p>
        <Link href="/en/tools/">See all tools</Link>
      </p>
    </LegalPage>
  );
}
