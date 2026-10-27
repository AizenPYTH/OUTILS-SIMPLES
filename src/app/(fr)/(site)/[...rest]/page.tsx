import { notFound } from "next/navigation";

/** Any unmatched French URL renders the French 404 inside the French root layout. */
export default function CatchAll() {
  notFound();
}
