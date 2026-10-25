import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main
        id="contenu"
        className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center"
      >
        <p className="text-sm font-semibold text-link">404</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{t.notFound.title}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">{t.notFound.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">{t.notFound.cta}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/#outils">{t.notFound.browse}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
