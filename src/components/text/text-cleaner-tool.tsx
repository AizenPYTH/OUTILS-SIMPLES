"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextInputPanel, TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { cleanText, defaultCleanOptions, type CleanOptions } from "@/lib/text/transform";

const toggles: { key: keyof Omit<CleanOptions, "sortLines">; label: string; hint: string }[] = [
  { key: "trimLines", label: "Supprimer les espaces en début et fin de ligne", hint: "" },
  { key: "collapseSpaces", label: "Réduire les espaces multiples à un seul", hint: "" },
  {
    key: "removeEmptyLines",
    label: "Supprimer les lignes vides",
    hint: "Sinon, les blocs de lignes vides sont réduits à une seule.",
  },
  {
    key: "joinWrappedLines",
    label: "Recoller les lignes coupées (texte copié d'un PDF)",
    hint: "Les sauts de ligne simples deviennent des espaces, les paragraphes sont conservés.",
  },
  {
    key: "fixPdfHyphenation",
    label: "Réparer les mots coupés par un tiret en fin de ligne",
    hint: "« docu-\\nment » devient « document ».",
  },
  { key: "removeDuplicateLines", label: "Supprimer les lignes en double", hint: "" },
  {
    key: "normalizeQuotes",
    label: "Remplacer les guillemets typographiques par des guillemets droits",
    hint: "",
  },
];

export function TextCleanerTool({ preset }: { preset?: Partial<CleanOptions> }) {
  const [text, setText] = React.useState("");
  const [options, setOptions] = React.useState<CleanOptions>({ ...defaultCleanOptions, ...preset });
  const output = React.useMemo(() => cleanText(text, options), [text, options]);
  const removedChars = text.length - output.length;
  return (
    <div className="space-y-4">
      <TextInputPanel
        id="clean-input"
        label="Texte à nettoyer"
        value={text}
        onChange={setText}
        rows={10}
      />
      <ToolPanel className="space-y-3">
        <h3 className="text-sm font-semibold">Options</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {toggles.map((tg) => (
            <li key={tg.key} className="flex items-start gap-2">
              <Checkbox
                id={`clean-${tg.key}`}
                checked={options[tg.key]}
                onCheckedChange={(c) => setOptions((o) => ({ ...o, [tg.key]: c === true }))}
                className="mt-0.5"
              />
              <Label
                htmlFor={`clean-${tg.key}`}
                className="flex-col items-start gap-0.5 font-normal"
              >
                <span>{tg.label}</span>
                {tg.hint ? <span className="text-xs text-muted-foreground">{tg.hint}</span> : null}
              </Label>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Label htmlFor="clean-sort" className="text-sm">
            Trier les lignes
          </Label>
          <Select
            value={options.sortLines}
            onValueChange={(v) =>
              setOptions((o) => ({ ...o, sortLines: v as CleanOptions["sortLines"] }))
            }
          >
            <SelectTrigger id="clean-sort" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ne pas trier</SelectItem>
              <SelectItem value="asc">A → Z (ordre naturel)</SelectItem>
              <SelectItem value="desc">Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ToolPanel>
      <TextOutputPanel
        id="clean-output"
        label={`Résultat${text ? ` · ${removedChars >= 0 ? `${removedChars} caractère(s) retiré(s)` : `${-removedChars} caractère(s) ajouté(s)`}` : ""}`}
        value={output}
        filename="texte-nettoye.txt"
        rows={10}
        toolId="text-clean"
      />
    </div>
  );
}
