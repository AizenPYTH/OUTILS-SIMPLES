import { NotFoundView } from "@/components/pages/not-found-view";
import { setRequestLocale } from "@/lib/i18n/locale";

export default function NotFound() {
  setRequestLocale("en");
  return <NotFoundView />;
}
