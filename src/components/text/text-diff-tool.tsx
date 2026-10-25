"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TextInputPanel } from "@/components/tools/shared/text-io";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { DownloadTextButton } from "@/components/tools/shared/download-text-button";
import { Segmented } from "@/components/pdf/shared/segmented";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { computeDiff, formatUnified, type DiffMode } from "@/lib/text/diff";
import { cn } from "@/lib/utils";

export function TextDiffTool() {
  const [a, setA] = React.useState("");
  const [b, setB] = React.useState("");
  const [mode, setMode] = React.useState<DiffMode>("words");
  const [ignoreCase, setIgnoreCase] = React.useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = React.useState(false);
  const result = React.useMemo(() => (a || b ? computeDiff(a, b, mode, { ignoreCase, ignoreWhitespace }) : null), [a, b, mode, ignoreCase, ignoreWhitespace]);
  const unified = React.useMemo(() => (result ? formatUnified(result.changes) : ""), [result]);
  const identical = result && result.summary.added === 0 && result.summary.removed === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TextInputPanel id="diff-a" label="Texte original" value={a} onChange={setA} rows={10} />
        <TextInputPanel id="diff-b" label="Texte modifié" value={b} onChange={setB} rows={10} />
      </div>
      <ToolPanel className="space-y-3">
        <Segmented
          label="Granularité"
          value={mode}
          onChange={setMode}
          options={[
            { value: "lines", label: "Lignes", description: "Idéal pour du code ou des listes" },
            { value: "words", label: "Mots", description: "Idéal pour du texte" },
            { value: "chars", label: "Caractères", description: "Détail maximal" },
          ]}
        />
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Checkbox id="diff-case" checked={ignoreCase} onCheckedChange={(c) => setIgnoreCase(c === true)} />
            <Label htmlFor="diff-case" className="font-normal">
              Ignorer la casse
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="diff-ws" checked={ignoreWhitespace} onCheckedChange={(c) => setIgnoreWhitespace(c === true)} disabled={mode !== "lines"} />
            <Label htmlFor="diff-ws" className="font-normal">
              Ignorer les espaces (mode lignes)
            </Label>
          </div>
        </div>
      </ToolPanel>
      {result ? (
        <ToolPanel className="space-y-3" data-testid="diff-result">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm" aria-live="polite">
              {identical ? (
                <span className="font-medium text-success-foreground">Les deux textes sont identiques.</span>
              ) : (
                <>
                  <span className="rounded bg-success-soft px-1.5 py-0.5 font-medium text-success-foreground">+{result.summary.added}</span>{" "}
                  <span className="rounded bg-destructive-soft px-1.5 py-0.5 font-medium text-destructive">−{result.summary.removed}</span>{" "}
                  <span className="text-muted-foreground">
                    {mode === "lines" ? "lignes" : "caractères"} ajoutés / supprimés
                  </span>
                </>
              )}
            </p>
            <div className="flex gap-1">
              <CopyButton text={unified} label="Copier le diff" />
              <DownloadTextButton text={unified} filename="comparaison.diff" toolId="text-diff" />
            </div>
          </div>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-[13px] leading-relaxed">
            {result.changes.map((change, i) => (
              <span key={i} className={cn(change.added && "bg-success-soft text-success-foreground", change.removed && "bg-destructive-soft text-destructive line-through decoration-destructive/60")}>
                {change.value}
              </span>
            ))}
          </pre>
        </ToolPanel>
      ) : null}
    </div>
  );
}
