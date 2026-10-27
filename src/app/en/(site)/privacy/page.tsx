import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
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

export default function PrivacyPage() {
  setRequestLocale("en");
  const analytics = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const ads = publicEnv.NEXT_PUBLIC_ADS_ENABLED;
  return (
    <LegalPage
      title="Privacy policy"
      path="/en/privacy/"
      intro="What we do, and above all what we do not do, with your files and your data."
      updatedAt="27 October 2026"
    >
      <section>
        <h2>1. Your files do not leave your browser</h2>
        <p>
          Every tool published on {siteConfig.name} runs entirely in your browser, thanks to
          open-source libraries (pdf.js, pdf-lib, Tesseract, qpdf, libheif, mammoth, exceljs, docx).
          Concretely:
        </p>
        <ul>
          <li>the file you drop is read by your browser and is never sent to our servers;</li>
          <li>the result is produced on your device and downloaded directly from it;</li>
          <li>
            no file, no document content and no file name is stored, logged or analysed by us;
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
        <h2>2. Technical data</h2>
        <p>
          Like any website, our hosting servers may record technical logs (IP address, timestamp,
          requested page, browser) needed for security and for the service to work. These logs are
          kept by the hosting provider under its own policy (
          <Placeholder
            label="Hosting provider and retention period"
            value={siteConfig.legal.hostingProvider}
          />
          ).
        </p>
      </section>
      <section>
        <h2>3. Preferences stored on your device</h2>
        <p>
          We use your browser&apos;s local storage (localStorage), not cookies, to remember your
          theme (light/dark) and your consent choices. This information contains no identifier and
          is never sent to us. The offline mode stores copies of the site&apos;s own files (pages,
          scripts, engines) in your browser cache; it never stores your documents.
        </p>
      </section>
      <section>
        <h2>4. Analytics</h2>
        {analytics === "none" ? (
          <p>
            <strong>No analytics tool is currently enabled.</strong> If the publisher enables one,
            it will only load after your explicit consent, and the measured events (page view, tool
            used, success or error) will never contain a file name or document content.
          </p>
        ) : (
          <p>
            An analytics tool (
            {analytics === "plausible" ? "Plausible Analytics" : "Google Analytics 4"}) is
            configured. It only loads after your consent and the measured events never contain a
            file name or document content. You can change your choice at any time on the{" "}
            <Link href="/en/cookies/">cookie settings</Link> page.
          </p>
        )}
      </section>
      <section>
        <h2>5. Advertising</h2>
        {ads ? (
          <p>
            Advertising slots provided by a third-party partner (Google AdSense) are shown on some
            pages. They only load after your consent, collected through a consent management
            platform. The partner may then set cookies and process data under its own privacy
            policy.
          </p>
        ) : (
          <p>
            <strong>No advertising is currently shown.</strong> If the publisher enables an
            advertising partner, this section and the cookie settings page will be updated, and no
            advertising script will load without your consent.
          </p>
        )}
      </section>
      <section>
        <h2>6. Your rights</h2>
        <p>
          Since we collect no personal data through the tools, requests for access, rectification or
          erasure mainly concern e-mail exchanges. You can contact us at{" "}
          <Placeholder label="Contact e-mail address" value={siteConfig.legal.contactEmail} />. You
          also have the right to lodge a complaint with the French data protection authority (CNIL)
          or your local supervisory authority.
        </p>
      </section>
      <section>
        <h2>7. Data controller</h2>
        <p>
          <Placeholder label="Name or company name" value={siteConfig.legal.publisherName} /> — see
          the <Link href="/en/legal-notice/">legal notice</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
