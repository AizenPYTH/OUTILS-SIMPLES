import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage, Placeholder } from "@/components/content/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: `Contacter l'équipe ${siteConfig.name} : question, bug, suggestion d'outil.`,
  path: "/contact/",
});

export default function ContactPage() {
  const email = siteConfig.legal.contactEmail;
  return (
    <LegalPage title="Contact" path="/contact/" intro="Une question, un bug, une idée d'outil ? Écrivez-nous.">
      <section>
        <h2>Par e-mail</h2>
        <p>
          {email ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            <Placeholder label="Adresse e-mail de contact" value="" />
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Pour un problème avec un fichier, décrivez les étapes suivies et le message affiché. N&apos;envoyez pas de document
          confidentiel : nous n&apos;en avons pas besoin pour reproduire la plupart des problèmes.
        </p>
      </section>
      <section>
        <h2>Suggestion d&apos;outil</h2>
        <p>
          Nous ajoutons un outil lorsqu&apos;il répond à un besoin réel et peut fonctionner de manière fiable dans le navigateur.
          Décrivez le problème que vous cherchez à résoudre plutôt que la solution : c&apos;est ce qui nous aide le plus.
        </p>
      </section>
    </LegalPage>
  );
}
