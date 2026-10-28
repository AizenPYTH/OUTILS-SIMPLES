import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { publisherKind } from "@/lib/legal";
import { getPublishedTools } from "@/lib/tools";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Privacy policy",
    description: `How ${siteConfig.name} handles your files and data: local processing in the browser, no document storage, third-party services subject to consent.`,
    path: "/en/privacy/",
    locale: "en",
  });
}

/** Same content as the French policy (src/app/(fr)/(site)/confidentialite/page.tsx). */
export default function PrivacyPage() {
  setRequestLocale("en");
  const analytics = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const ads = publicEnv.NEXT_PUBLIC_ADS_ENABLED;
  const l = siteConfig.legal;
  const tools = getPublishedTools("en");
  const allLocal = tools.every((tool) => tool.processing === "client");
  return (
    <LegalPage
      title="Privacy policy"
      path="/en/privacy/"
      intro="What we do, and above all what we do not do, with your files and your data."
      updatedAt="28 October 2026"
    >
      <section>
        <h2>1. Your files do not leave your browser</h2>
        <p>
          {allLocal
            ? `The ${tools.length} tools published on ${siteConfig.name} run entirely in your browser`
            : `The tools marked “Processed in your browser” run entirely in your browser`}
          , using open-source libraries executed on your device (notably pdf.js, pdf-lib, qpdf,
          Tesseract for text recognition and libheif for HEIC photos). In practice:
        </p>
        <ul>
          <li>
            the file you drop, or the photo taken with the camera, is read by your browser and is
            never sent to a server;
          </li>
          <li>the result is generated on your device and downloaded directly from it;</li>
          <li>
            no file, document content or file name is stored, logged or analysed by the publisher;
          </li>
          <li>
            the only downloads made by the tools are the site&apos;s own files (code, fonts, text
            recognition engine and language models);
          </li>
          <li>temporary data is released as soon as you leave the page or process another file.</li>
        </ul>
        <p>
          If a tool requiring server-side processing were added in the future, it would be clearly
          marked on its page (“Processed on our servers”) and this policy would be updated before
          its publication. The <Link href="/en/verify-it/">check it yourself</Link> page explains
          how to verify this behaviour.
        </p>
      </section>
      <section>
        <h2>2. Hosting and technical data</h2>
        <p>
          The site&apos;s pages and files are served by the hosting provider (
          <Placeholder label="Hosting provider" value={l.hostingProvider} />, see the{" "}
          <Link href="/en/legal-notice/">legal notice</Link>). As with any website, each request
          sends it technical data: IP address, date and time, page or file requested, browser and
          referring page. The hosting provider processes this data to deliver the pages and keep the
          service secure, and keeps it according to its own privacy policy. The publisher does not
          use it to track visitors.
        </p>
        <p>
          Legal basis: the publisher&apos;s legitimate interest in providing a working, secure site
          (GDPR article 6(1)(f)). Where the hosting provider is established outside the European
          Union, the safeguards for the transfer (adequacy decision or standard contractual clauses)
          are described in its privacy policy.
        </p>
      </section>
      <section>
        <h2>3. What is stored on your device</h2>
        <p>
          The site uses no cookies. It keeps the following in your browser, without any identifier
          and without ever sending them to us:
        </p>
        <ul>
          <li>your theme (light, dark or system) and your consent choices (local storage);</li>
          <li>
            copies of the site&apos;s pages and files you have already visited, and of the tools you
            save for offline use (browser cache, through a service worker);
          </li>
          <li>
            the text recognition language models, after you first use OCR, so they are not
            downloaded again (browser IndexedDB).
          </li>
        </ul>
        <p>
          None of this contains your documents or data about you. You can delete it at any time by
          clearing the site&apos;s data in your browser settings.
        </p>
      </section>
      <section>
        <h2>4. Analytics</h2>
        {analytics === "none" ? (
          <p>
            <strong>No analytics tool is currently enabled.</strong> If the publisher enables one,
            this policy will be updated before it is switched on, and measurements will never
            contain a file name or document content.
          </p>
        ) : (
          <p>
            An analytics tool (
            {analytics === "plausible" ? "Plausible Analytics" : "Google Analytics 4"}) is
            configured. It only loads after your consent and the events measured never contain a
            file name or document content. You can change your choice at any time on the{" "}
            <Link href="/en/cookies/">cookie settings</Link> page.
          </p>
        )}
      </section>
      <section>
        <h2>5. Advertising</h2>
        {ads ? (
          <p>
            Ad spaces provided by a third-party partner (Google AdSense) are shown on some pages.
            They only load after your consent, collected through a consent management platform. The
            partner may then set cookies and process data under its own privacy policy.
          </p>
        ) : (
          <p>
            <strong>The site shows no advertising</strong> and loads no advertising script.
          </p>
        )}
      </section>
      <section>
        <h2>6. If you write to us</h2>
        <p>
          Messages sent to the contact address (your e-mail address and the content of the message)
          are only used to answer you and follow up on your request, then deleted once they are no
          longer needed for that purpose. They are never sold or used for marketing. Do not attach
          confidential documents.
        </p>
      </section>
      <section>
        <h2>7. Your rights</h2>
        <p>
          You have the right to access, rectify, erase, object to and restrict the processing of
          data about you. Write to{" "}
          <Placeholder label="Contact e-mail address" value={l.contactEmail} />. You can also lodge
          a complaint with the CNIL, the French data protection authority (
          <a href="https://www.cnil.fr/en/" rel="noopener noreferrer">
            cnil.fr/en
          </a>
          ) or with the authority of your country.
        </p>
      </section>
      <section>
        <h2>8. Data controller</h2>
        <p>
          {publisherKind() === "anonymous" ? (
            <>The publisher of the site</>
          ) : (
            <Placeholder label="Publisher's name" value={l.publisherName} />
          )}{" "}
          — see the <Link href="/en/legal-notice/">legal notice</Link>. Contact:{" "}
          <Placeholder label="Contact e-mail address" value={l.contactEmail} />.
        </p>
      </section>
    </LegalPage>
  );
}
