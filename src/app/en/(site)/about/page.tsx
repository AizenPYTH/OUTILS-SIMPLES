import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedTools } from "@/lib/tools";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "About",
    description: `${siteConfig.name}: simple, fast online tools that respect your files, processed directly in your browser.`,
    path: "/en/about/",
    locale: "en",
  });
}

export default function AboutPage() {
  setRequestLocale("en");
  const count = getPublishedTools().length;
  return (
    <LegalPage
      title={`About ${siteConfig.name}`}
      path="/en/about/"
      intro="Simple, fast and private online tools"
    >
      <section>
        <h2>Why this site</h2>
        <p>
          Everyday file tasks — merging two PDFs, signing a quote, shrinking an attachment — should
          not require paid software or sending personal documents to an unknown service.{" "}
          {siteConfig.name} gathers tools that do one thing, do it well, and do it in your browser.
        </p>
      </section>
      <section>
        <h2>How it works</h2>
        <p>
          The {count} tools published today rely on proven open-source libraries: pdf.js, developed
          by Mozilla, to display pages, pdf-lib to modify them, Tesseract for text recognition. The
          file is read by your browser, transformed on your device, then downloaded: it goes through
          no server.
        </p>
      </section>
      <section>
        <h2>What we do not do</h2>
        <ul>
          <li>We do not publish a tool until it really works.</li>
          <li>We do not show fake testimonials, user counters or unrealistic promises.</li>
          <li>We neither keep nor analyse your documents.</li>
        </ul>
      </section>
      <section>
        <h2>Languages</h2>
        <p>
          The site is written in French first. This English version covers the navigation, the tool
          pages and the guides; where a tool&apos;s own interface still contains French, its page
          says so. A question, an idea? Head to the <Link href="/en/contact/">contact</Link> page.
        </p>
      </section>
    </LegalPage>
  );
}
