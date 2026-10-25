import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
      <JsonLd data={buildBreadcrumbJsonLd(items)} />
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-foreground">
                  {item.name}
                </Link>
              )}
              {!last ? <ChevronRight className="size-3.5" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
