import { permanentRedirect } from "next/navigation";

/** The catalogue lives on the home page (design decision); keep /outils/ as a stable alias. */
export default function OutilsPage() {
  permanentRedirect("/");
}
