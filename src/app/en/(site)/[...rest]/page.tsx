import { notFound } from "next/navigation";

/** Any unmatched /en URL renders the English 404 inside the English root layout. */
export default function CatchAll() {
  notFound();
}
