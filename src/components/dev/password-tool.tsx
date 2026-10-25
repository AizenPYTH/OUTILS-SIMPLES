"use client";

import * as React from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { ToolPanel, StatGrid } from "@/components/tools/shared/tool-panel";
import { generatePassword, passwordEntropyBits, type PasswordOptions } from "@/lib/dev/random";
import { cn } from "@/lib/utils";

const DEFAULTS: PasswordOptions = { length: 16, lowercase: true, uppercase: true, digits: true, symbols: true, excludeAmbiguous: true };

function strength(bits: number): { label: string; className: string; width: string } {
  if (bits < 40) return { label: "Faible", className: "bg-destructive", width: "25%" };
  if (bits < 60) return { label: "Moyen", className: "bg-warning", width: "50%" };
  if (bits < 80) return { label: "Fort", className: "bg-success", width: "75%" };
  return { label: "Très fort", className: "bg-success", width: "100%" };
}

function safeGenerate(options: PasswordOptions, count: number): string[] {
  try {
    return Array.from({ length: count }, () => generatePassword(options));
  } catch {
    return [];
  }
}

export function PasswordTool() {
  const [options, setOptions] = React.useState<PasswordOptions>(DEFAULTS);
  const [count, setCount] = React.useState(5);
  const [list, setList] = React.useState<string[]>(() => safeGenerate(DEFAULTS, 5));
  const update = (patch: Partial<PasswordOptions>, nextCount = count) => {
    const next = { ...options, ...patch };
    setOptions(next);
    setList(safeGenerate(next, nextCount));
  };
  const bits = passwordEntropyBits(options);
  const meter = strength(bits);
  const noPool = !options.lowercase && !options.uppercase && !options.digits && !options.symbols;

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pw-length">Longueur : {options.length} caractères</Label>
            <input id="pw-length" type="range" min={8} max={64} value={options.length} onChange={(e) => update({ length: Number(e.target.value) })} className="w-full accent-primary" data-testid="pw-length" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-count">Nombre de propositions : {count}</Label>
            <input
              id="pw-count"
              type="range"
              min={1}
              max={20}
              value={count}
              onChange={(e) => {
                const n = Number(e.target.value);
                setCount(n);
                update({}, n);
              }}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {(
            [
              ["lowercase", "minuscules (a-z)"],
              ["uppercase", "MAJUSCULES (A-Z)"],
              ["digits", "chiffres (0-9)"],
              ["symbols", "symboles (!@#$…)"],
              ["excludeAmbiguous", "éviter les caractères ambigus (0/O, 1/l/I)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <Checkbox checked={options[key]} onCheckedChange={(v) => update({ [key]: v === true })} /> {label}
            </label>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="size-4" aria-hidden="true" /> Robustesse : {noPool ? "—" : meter.label}
            </span>
            <span className="text-muted-foreground">{bits} bits d&apos;entropie</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={128} aria-valuenow={bits} aria-label="Robustesse du mot de passe">
            <div className={cn("h-full rounded-full transition-all", meter.className)} style={{ width: noPool ? "0%" : meter.width }} />
          </div>
        </div>
        <Button type="button" onClick={() => setList(safeGenerate(options, count))} disabled={noPool} data-testid="pw-regenerate">
          <RefreshCw aria-hidden="true" /> Générer de nouveaux mots de passe
        </Button>
      </ToolPanel>
      {noPool ? <p className="text-sm text-destructive">Sélectionnez au moins un type de caractères.</p> : null}
      <ul className="space-y-2" aria-label="Mots de passe proposés" data-testid="pw-list">
        {list.map((pw, i) => (
          <li key={`${i}-${pw}`} className="flex items-center gap-2 rounded-[12px] border border-border bg-surface px-3 py-2">
            <code className="min-w-0 flex-1 break-all font-mono text-sm" data-testid="pw-item">
              {pw}
            </code>
            <CopyButton text={pw} label="Copier" />
          </li>
        ))}
      </ul>
      <StatGrid items={[{ label: "Entropie", value: `${bits} bits` }, { label: "Combinaisons", value: bits > 0 ? `2^${bits}` : "—" }, { label: "Conseil", value: options.length >= 14 ? "OK" : "≥ 14 car." }]} className="sm:grid-cols-3 lg:grid-cols-3" />
      <p className="text-xs text-muted-foreground">Générés localement avec l&apos;API Web Crypto (aléatoire cryptographique, sans biais de modulo). Utilisez un gestionnaire de mots de passe pour les conserver ; ne réutilisez jamais un mot de passe.</p>
    </div>
  );
}
