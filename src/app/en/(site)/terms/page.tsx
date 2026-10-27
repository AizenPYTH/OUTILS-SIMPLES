import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Terms of use",
    description: `Terms of use of the ${siteConfig.name} online tools: free use, responsibilities, limits of the service.`,
    path: "/en/terms/",
    locale: "en",
  });
}

export default function TermsPage() {
  setRequestLocale("en");
  return (
    <LegalPage title="Terms of use" path="/en/terms/" updatedAt="27 October 2026">
      <section>
        <h2>1. Purpose</h2>
        <p>
          {siteConfig.name} provides free online tools for working with documents. Using the site
          means accepting these terms.
        </p>
      </section>
      <section>
        <h2>2. Permitted use</h2>
        <p>
          You agree to use the tools only on documents you own or are allowed to modify. In
          particular, it is forbidden to use the service to bypass protections, remove copyright or
          ownership notices without permission, or infringe the rights of third parties.
        </p>
      </section>
      <section>
        <h2>3. No warranty</h2>
        <p>
          The tools are provided “as is”, without any guarantee of result. Processing runs in your
          browser: its success also depends on your device (available memory, browser version).
          Always keep a copy of your original files and check the documents produced.
        </p>
        <p>
          Signatures added with the “Sign a PDF” tool are visual signatures and do not constitute
          qualified electronic signatures within the meaning of the eIDAS regulation. The “Redact”
          tool removes content from the page as described on its page; verify the result before
          relying on it.
        </p>
      </section>
      <section>
        <h2>4. Availability and changes</h2>
        <p>
          The publisher may modify, suspend or withdraw all or part of the tools at any time, in
          particular for maintenance. Paid features may be offered later; the basic tools will
          remain usable without an account.
        </p>
      </section>
      <section>
        <h2>5. Personal data</h2>
        <p>
          Data processing is described in the <Link href="/en/privacy/">privacy policy</Link>.
        </p>
      </section>
      <section>
        <h2>6. Governing law</h2>
        <p>
          These terms are governed by French law. This translation is provided for convenience; the
          French version prevails.
        </p>
      </section>
    </LegalPage>
  );
}
