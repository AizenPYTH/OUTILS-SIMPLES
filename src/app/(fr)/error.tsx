"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the error message is logged: never file names or document data.
    console.error("[averopdf] route error", error.digest ?? error.message);
  }, [error]);

  return (
    <main
      id="contenu"
      className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center"
    >
      <h1 className="text-3xl">{t.error.title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t.error.body}</p>
      <Button className="mt-8" onClick={reset}>
        {t.error.retry}
      </Button>
    </main>
  );
}
