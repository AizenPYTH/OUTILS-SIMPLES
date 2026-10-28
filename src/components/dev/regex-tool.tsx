"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  regexFlags,
  regexPresets,
  replaceWithRegex,
  runRegex,
  segmentMatches,
} from "@/lib/dev/regex";
import { tr } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

// Translated at render (see src/lib/dev/regex.ts): the tool is server-rendered.
const sample = () =>
  [
    tr("Contactez jean.dupont@exemple.fr ou marie@site.org avant le 12/03/2026."),
    tr("Téléphone : 06 12 34 56 78 — code postal 75011."),
  ].join("\n");

export function RegexTool() {
  const [pattern, setPattern] = React.useState("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");
  const [flags, setFlags] = React.useState("gi");
  const [text, setText] = React.useState(sample);
  const presets = regexPresets();
  const flagOptions = regexFlags();
  const [replacement, setReplacement] = React.useState("");

  const result = React.useMemo(() => runRegex(pattern, flags, text), [pattern, flags, text]);
  const replaced = React.useMemo(
    () => (replacement ? replaceWithRegex(pattern, flags, text, replacement) : null),
    [pattern, flags, text, replacement],
  );
  const toggleFlag = (flag: string, on: boolean) =>
    setFlags((f) => (on ? (f.includes(flag) ? f : f + flag) : f.replace(flag, "")));

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="regex-pattern">{tr("Expression régulière")}</Label>
            <div className="flex items-center gap-1 font-mono text-sm">
              <span className="text-muted-foreground">/</span>
              <Input
                id="regex-pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="font-mono"
                spellCheck={false}
                data-testid="regex-pattern"
              />
              <span className="text-muted-foreground">/{flags}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="regex-preset">{tr("Exemples")}</Label>
            <Select
              onValueChange={(v) => {
                const preset = presets[Number(v)];
                if (preset) {
                  setPattern(preset.pattern);
                  setFlags(preset.flags);
                }
              }}
            >
              <SelectTrigger id="regex-preset" className="w-52">
                <SelectValue placeholder={tr("Choisir un modèle")} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p, i) => (
                  <SelectItem key={p.label} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {flagOptions.map((f) => (
            <label key={f.flag} className="flex items-center gap-2">
              <Checkbox
                checked={flags.includes(f.flag)}
                onCheckedChange={(v) => toggleFlag(f.flag, v === true)}
              />{" "}
              {f.label}
            </label>
          ))}
        </div>
        {!result.ok ? (
          <Alert variant="destructive" data-testid="regex-error">
            {tr(result.error)}
          </Alert>
        ) : null}
      </ToolPanel>
      <TextInputPanel
        id="regex-text"
        label={tr("Texte de test")}
        value={text}
        onChange={setText}
        rows={6}
      />
      {result.ok ? (
        <ToolPanel className="space-y-3" data-testid="regex-results">
          <p className="text-sm font-medium">
            {tr(result.matches.length > 1 ? "{n} correspondances" : "{n} correspondance", {
              n: result.matches.length,
            })}
            {result.truncated ? " " + tr("(affichage limité)") : ""}
            {!result.global && result.matches.length === 1
              ? " " + tr("— ajoutez le drapeau g pour toutes les occurrences")
              : ""}
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-[13px] leading-relaxed">
            {segmentMatches(text, result.matches).map((seg, i) => (
              <span
                key={i}
                className={cn(
                  seg.match && "rounded bg-primary-soft text-link ring-1 ring-primary/40",
                )}
              >
                {seg.text}
              </span>
            ))}
          </pre>
          {result.matches.length > 0 &&
          (result.matches[0]!.groups.length > 0 ||
            Object.keys(result.matches[0]!.named).length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{tr("Correspondances et groupes capturés")}</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1 pr-3 font-semibold">#</th>
                    <th className="py-1 pr-3 font-semibold">{tr("Correspondance")}</th>
                    <th className="py-1 font-semibold">{tr("Groupes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.slice(0, 200).map((m, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 align-top font-mono text-[12px]"
                    >
                      <td className="py-1 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-1 pr-3 break-all">{m.text}</td>
                      <td className="py-1 break-all">
                        {m.groups.map((g, k) => (
                          <span key={k} className="mr-2 inline-block rounded bg-muted px-1">
                            ${k + 1} = {g ?? "∅"}
                          </span>
                        ))}
                        {Object.entries(m.named).map(([name, value]) => (
                          <span key={name} className="mr-2 inline-block rounded bg-muted px-1">
                            {name} = {value ?? "∅"}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </ToolPanel>
      ) : null}
      <ToolPanel className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="regex-replacement">
            {tr("Remplacement (facultatif) — $1, $2 ou $<nom> pour les groupes")}
          </Label>
          <Input
            id="regex-replacement"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            className="font-mono"
            placeholder={tr("ex. [$&]")}
            data-testid="regex-replacement"
          />
        </div>
        {replaced ? (
          replaced.ok ? (
            <TextOutputPanel
              id="regex-replaced"
              label={tr("Texte remplacé")}
              value={replaced.result}
              filename="texte-remplace.txt"
              rows={5}
            />
          ) : (
            <Alert variant="destructive">{tr(replaced.error)}</Alert>
          )
        ) : null}
      </ToolPanel>
      <p className="text-xs text-muted-foreground">
        {tr(
          "Syntaxe JavaScript (ECMAScript) : la même que dans les navigateurs et Node.js. Les expressions sont exécutées localement ; une expression très coûteuse peut ralentir l'onglet.",
        )}
      </p>
    </div>
  );
}
