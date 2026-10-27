"use client";

import * as React from "react";
import { TextInputPanel, TextOutputPanel } from "@/components/tools/shared/text-io";
import { changeCase, type CaseMode } from "@/lib/text/transform";
import { tr } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const modes: { id: CaseMode; label: string; example: string }[] = [
  { id: "upper", label: tr("MAJUSCULES"), example: tr("BONJOUR LE MONDE") },
  { id: "lower", label: tr("minuscules"), example: tr("bonjour le monde") },
  { id: "sentence", label: tr("Phrase"), example: tr("Bonjour le monde. Ça va ?") },
  { id: "capitalize-words", label: tr("Chaque Mot"), example: tr("Bonjour Le Monde") },
  { id: "title", label: tr("Titre"), example: tr("Bonjour le Monde") },
  { id: "invert", label: tr("iNVERSER"), example: tr("bONJOUR lE mONDE") },
  { id: "snake", label: "snake_case", example: tr("bonjour_le_monde") },
  { id: "kebab", label: "kebab-case", example: tr("bonjour-le-monde") },
  { id: "camel", label: "camelCase", example: tr("bonjourLeMonde") },
];

export function CaseConverterTool() {
  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState<CaseMode>("upper");
  const output = React.useMemo(() => changeCase(text, mode), [text, mode]);
  return (
    <div className="space-y-4">
      <TextInputPanel
        id="case-input"
        label={tr("Texte à convertir")}
        value={text}
        onChange={setText}
        rows={8}
      />
      <div
        role="radiogroup"
        aria-label={tr("Type de conversion")}
        className="grid gap-2 sm:grid-cols-3"
      >
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex min-h-[42px] flex-col items-start justify-center rounded-md border-[1.5px] px-3 py-2 text-left text-sm",
              mode === m.id
                ? "border-primary bg-primary-soft"
                : "border-border bg-surface hover:bg-muted",
            )}
            data-testid={`case-${m.id}`}
          >
            <span className="font-medium">{m.label}</span>
            <span className="text-xs text-muted-foreground">{m.example}</span>
          </button>
        ))}
      </div>
      <TextOutputPanel
        id="case-output"
        label={tr("Résultat")}
        value={output}
        filename="texte-converti.txt"
        rows={8}
        toolId="text-case"
      />
    </div>
  );
}
