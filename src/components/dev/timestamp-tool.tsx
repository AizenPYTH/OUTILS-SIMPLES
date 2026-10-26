"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { describeInstant, parseInstant, toDateTimeLocal } from "@/lib/dev/timestamp";

export function TimestampTool() {
  const [input, setInput] = React.useState(() => String(Math.floor(Date.now() / 1000)));
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parsed = parseInstant(input);
  const description = parsed ? describeInstant(parsed.ms, now) : null;

  const rows: { label: string; value: string }[] = description?.valid
    ? [
        { label: "Timestamp Unix (secondes)", value: String(description.unixSeconds) },
        { label: "Timestamp (millisecondes)", value: String(description.unixMilliseconds) },
        { label: "ISO 8601 (UTC)", value: description.iso },
        { label: `Heure locale (${description.localZone})`, value: description.local },
        { label: "UTC", value: description.utc },
        { label: "Relatif", value: description.relative },
        {
          label: "Jour de l'année · semaine ISO",
          value: `${description.dayOfYear} · semaine ${description.isoWeek}`,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1">
            <Label htmlFor="ts-input">
              Timestamp (secondes ou millisecondes) ou date (ISO, JJ/MM/AAAA)
            </Label>
            <Input
              id="ts-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="font-mono"
              spellCheck={false}
              data-testid="ts-input"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ts-picker">Choisir une date</Label>
            <input
              id="ts-picker"
              type="datetime-local"
              step={1}
              value={parsed && description?.valid ? toDateTimeLocal(parsed.ms) : ""}
              onChange={(e) =>
                e.target.value && setInput(String(new Date(e.target.value).getTime()))
              }
              className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}
              data-testid="ts-now"
            >
              <Clock aria-hidden="true" /> Maintenant
            </Button>
          </div>
        </div>
        {parsed?.source === "seconds" ? (
          <p className="text-xs text-muted-foreground">
            Interprété en secondes (10 chiffres). Saisissez 13 chiffres pour des millisecondes.
          </p>
        ) : null}
        {!parsed && input.trim() ? (
          <Alert variant="destructive">
            Valeur non reconnue. Exemples : 1700000000, 2026-03-12T10:00:00Z, 12/03/2026 14:30.
          </Alert>
        ) : null}
        {description && !description.valid ? (
          <Alert variant="destructive">Date hors des limites représentables.</Alert>
        ) : null}
      </ToolPanel>
      {rows.length ? (
        <ToolPanel>
          <dl className="divide-y divide-border/60" data-testid="ts-results">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-center gap-2 py-2">
                <dt className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-64">
                  {row.label}
                </dt>
                <dd className="min-w-0 flex-1 break-all font-mono text-sm">{row.value}</dd>
                <CopyButton text={row.value} label="Copier" />
              </div>
            ))}
          </dl>
        </ToolPanel>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Heure actuelle : <span className="font-mono">{Math.floor(now / 1000)}</span> · fuseau
        détecté : {Intl.DateTimeFormat().resolvedOptions().timeZone}. Le timestamp Unix compte les
        secondes écoulées depuis le 1er janvier 1970 à 00:00 UTC.
      </p>
    </div>
  );
}
