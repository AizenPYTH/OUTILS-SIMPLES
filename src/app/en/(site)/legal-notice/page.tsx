import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Legal notice",
    description: `Legal notice of ${siteConfig.name}: publisher, hosting provider, intellectual property.`,
    path: "/en/legal-notice/",
    locale: "en",
  });
}

export default function LegalNoticePage() {
  setRequestLocale("en");
  const l = siteConfig.legal;
  return (
    <LegalPage title="Legal notice" path="/en/legal-notice/">
      <p className="rounded-md border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
        The framed information below must be provided through the <code>NEXT_PUBLIC_LEGAL_*</code>{" "}
        environment variables before going live. This template is not legal advice. The French
        version of this notice is the authoritative one.
      </p>
      <section>
        <h2>Publisher</h2>
        <p>
          The site {siteConfig.name} is published by{" "}
          <Placeholder label="Name or company name" value={l.publisherName} />,{" "}
          <Placeholder label="Legal form / status" value={l.publisherStatus} />, whose registered
          office is at <Placeholder label="Address" value={l.publisherAddress} />.
        </p>
        <p>
          Registration:{" "}
          <Placeholder label="SIREN/SIRET or RCS number" value={l.registrationNumber} /> · VAT
          number: <Placeholder label="VAT number" value={l.vatNumber} />.
        </p>
        <p>
          Publication director:{" "}
          <Placeholder label="Publication director" value={l.publicationDirector} />.
        </p>
        <p>
          Contact: <Placeholder label="Contact e-mail address" value={l.contactEmail} />.
        </p>
      </section>
      <section>
        <h2>Hosting</h2>
        <p>
          The site is hosted by <Placeholder label="Hosting provider" value={l.hostingProvider} />,{" "}
          <Placeholder label="Hosting provider's address" value={l.hostingAddress} />.
        </p>
      </section>
      <section>
        <h2>Intellectual property</h2>
        <p>
          The structure of the site, its texts and graphic elements are protected by copyright. The
          open-source libraries used (notably pdf.js and pdf-lib) remain subject to their own
          licences. The documents you process with the tools remain your exclusive property: they
          are neither transmitted to nor kept by the publisher.
        </p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>
          The tools are provided free of charge and as is. The publisher strives to keep them
          working but cannot guarantee the absence of errors or the suitability of the result for a
          particular use. Always check the documents produced before using them.
        </p>
      </section>
    </LegalPage>
  );
}
