import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";

interface LegalPageProps {
  title: string;
  path: string;
  intro?: string;
  updatedAt?: string;
  children: React.ReactNode;
}

/** Shared shell for textual pages (legal, about, contact). */
export function LegalPage({ title, path, intro, updatedAt, children }: LegalPageProps) {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t.nav.home, path: localizedPath("/") },
          { name: title, path },
        ]}
      />
      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-[clamp(30px,4vw,44px)] leading-[1.08]">{title}</h1>
        {intro ? <p className="mt-3 text-lg text-muted-foreground">{intro}</p> : null}
        {updatedAt ? (
          <p className="mt-2 text-sm text-muted-foreground">{t.legal.updatedAt(updatedAt)}</p>
        ) : null}
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:text-lg [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-link [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-link/50 hover:[&_a]:decoration-link">
          {children}
        </div>
      </article>
    </div>
  );
}

/** Highlights information the site owner must supply before launch. Nothing is invented. */
export function Placeholder({ label, value }: { label: string; value: string }) {
  if (value) return <span>{value}</span>;
  return (
    <span
      className="rounded-sm bg-warning-soft px-1.5 py-0.5 font-medium text-warning-foreground"
      data-placeholder={label}
    >
      {t.legal.placeholder(label)}
    </span>
  );
}
