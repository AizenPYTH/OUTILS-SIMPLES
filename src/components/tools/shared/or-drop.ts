import { t } from "@/lib/i18n";

/**
 * The line under a drop zone's main button: its title ("Déposez votre PDF
 * ici") introduced by "ou", as in "ou déposez votre PDF ici".
 */
export function orDrop(title: string): string {
  return `${t.upload.dropOr} ${title.charAt(0).toLocaleLowerCase()}${title.slice(1)}`;
}
