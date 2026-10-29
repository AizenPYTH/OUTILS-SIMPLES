import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { isLegalIdentityIncomplete, publisherKind } from "@/lib/legal";
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

/** Same rules as the French notice (src/app/(fr)/(site)/mentions-legales/page.tsx). */
export default function LegalNoticePage() {
  setRequestLocale("en");
  const l = siteConfig.legal;
  const kind = publisherKind();
  return (
    <LegalPage title="Legal notice" path="/en/legal-notice/" updatedAt="28 October 2026">
      {isLegalIdentityIncomplete() ? (
        <p className="rounded-md border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
          The framed information below must be provided through the <code>NEXT_PUBLIC_LEGAL_*</code>{" "}
          environment variables before going live. This template is not legal advice.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        The French version of this notice is the authoritative one.
      </p>
      <section>
        <h2>Publisher</h2>
        {kind === "company" ? (
          <>
            <p>
              The site {siteConfig.name} is published by{" "}
              <Placeholder label="Company name" value={l.publisherName} />,{" "}
              <Placeholder label="Legal form" value={l.publisherStatus} />, whose registered office
              is at <Placeholder label="Registered office address" value={l.publisherAddress} />,
              telephone: <Placeholder label="Telephone" value={l.publisherPhone} />.
            </p>
            <p>
              Registration:{" "}
              <Placeholder label="SIREN/SIRET or RCS number" value={l.registrationNumber} />
              {l.vatNumber ? ` · VAT number: ${l.vatNumber}` : ""}.
            </p>
            <p>
              Publication director:{" "}
              <Placeholder label="Publication director" value={l.publicationDirector} />.
            </p>
          </>
        ) : kind === "anonymous" ? (
          <p>
            The site {siteConfig.name} is published on a non-professional basis by a private
            individual who has chosen to remain anonymous, as allowed by article 1-1, II of French
            law no. 2004-575 of 21 June 2004 (LCEN). Their identification details have been provided
            to the hosting provider named below.
          </p>
        ) : (
          <>
            <p>
              The site {siteConfig.name} is published by{" "}
              <Placeholder label="First and last name" value={l.publisherName} />, a private
              individual.
            </p>
            <p>
              Home address:{" "}
              <Placeholder label="Publisher's home address" value={l.publisherAddress} />.
            </p>
            <p>
              Telephone: <Placeholder label="Publisher's telephone" value={l.publisherPhone} />.
            </p>
            {l.registrationNumber ? <p>Registration: {l.registrationNumber}.</p> : null}
            <p>
              Publication director:{" "}
              <Placeholder
                label="First and last name"
                value={l.publicationDirector || l.publisherName}
              />
              .
            </p>
          </>
        )}
        <p>
          Contact: <Placeholder label="Contact e-mail address" value={l.contactEmail} />.
        </p>
      </section>
      <section>
        <h2>Hosting</h2>
        <p>
          The site is hosted by <Placeholder label="Hosting provider" value={l.hostingProvider} />,{" "}
          <Placeholder label="Hosting provider's address" value={l.hostingAddress} />
          {kind === "anonymous" && !l.hostingPhone ? null : (
            <>
              , telephone:{" "}
              <Placeholder label="Hosting provider's telephone" value={l.hostingPhone} />
            </>
          )}
          .
        </p>
      </section>
      <section>
        <h2>Intellectual property</h2>
        <p>
          The structure of the site, its texts and graphic elements are protected by copyright. The
          open-source libraries used remain subject to their own licences. The documents you process
          with the tools remain your exclusive property: they are neither transmitted to nor kept by
          the publisher.
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
