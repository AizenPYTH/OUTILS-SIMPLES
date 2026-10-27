import { HomePage } from "@/components/pages/home-page";
import { setRequestLocale } from "@/lib/i18n/locale";

export default function Page() {
  setRequestLocale("en");
  return <HomePage />;
}
