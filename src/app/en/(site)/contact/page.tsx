import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Contact",
    description: `Contact the ${siteConfig.name} team: a question, a bug, a tool suggestion.`,
    path: "/en/contact/",
    locale: "en",
  });
}

export default function ContactPage() {
  setRequestLocale("en");
  const email = siteConfig.legal.contactEmail;
  return (
    <LegalPage
      title="Contact"
      path="/en/contact/"
      intro="A question, a bug, an idea for a tool? Write to us."
    >
      <section>
        <h2>By e-mail</h2>
        <p>
          {email ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            <Placeholder label="Contact e-mail address" value="" />
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          For a problem with a file, describe the steps you followed and the message shown. Do not
          send confidential documents: we do not need them to reproduce most problems.
        </p>
      </section>
      <section>
        <h2>Suggest a tool</h2>
        <p>
          We add a tool when it answers a real need and can work reliably in the browser. Describe
          the problem you are trying to solve rather than the solution: that is what helps us most.
        </p>
      </section>
    </LegalPage>
  );
}
