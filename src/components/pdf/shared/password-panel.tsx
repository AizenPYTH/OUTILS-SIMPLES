"use client";

import * as React from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tr } from "@/lib/i18n/messages";

interface PasswordPanelProps {
  fileName: string;
  incorrect: boolean;
  busy: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

/**
 * Asked when a PDF is protected by an open password. Nothing leaves the
 * browser: the password is given to pdf.js and qpdf locally.
 */
export function PasswordPanel({
  fileName,
  incorrect,
  busy,
  onSubmit,
  onCancel,
}: PasswordPanelProps) {
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (incorrect) inputRef.current?.select();
  }, [incorrect]);
  return (
    <form
      className="rounded-[24px] border border-border bg-surface p-6 sm:p-8"
      data-testid="password-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.length > 0 && !busy) onSubmit(value);
      }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-link">
          <LockKeyhole className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-xl font-bold">
          {tr("Ce PDF est protégé par un mot de passe")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {tr(
            "« {name} » demande un mot de passe d'ouverture. Saisissez-le pour l'ouvrir ici : il reste dans votre navigateur, le document est déverrouillé localement.",
            { name: fileName },
          )}
        </p>
      </div>
      <div className="mx-auto mt-6 max-w-sm space-y-2">
        <Label htmlFor="pdf-password">{tr("Mot de passe")}</Label>
        <Input
          ref={inputRef}
          id="pdf-password"
          type="password"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={incorrect || undefined}
          aria-describedby={incorrect ? "pdf-password-error" : undefined}
          disabled={busy}
          data-testid="password-input"
        />
        {incorrect ? (
          <p
            id="pdf-password-error"
            role="alert"
            className="text-sm text-destructive"
            data-testid="password-error"
          >
            {tr("Mot de passe incorrect. Vérifiez la casse et réessayez.")}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="submit" disabled={value.length === 0 || busy} data-testid="password-submit">
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {tr("Ouvrir le document")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {tr("Choisir un autre fichier")}
        </Button>
      </div>
    </form>
  );
}
