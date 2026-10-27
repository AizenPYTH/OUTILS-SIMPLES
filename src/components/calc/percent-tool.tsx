"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/pdf/shared/segmented";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import {
  FRENCH_VAT_RATES,
  applyPercent,
  beforePercent,
  formatAmount,
  parseNumber,
  percentChange,
  percentOf,
  vatFromAmount,
  vatFromHt,
  vatFromTtc,
  whatPercent,
} from "@/lib/calc/percent";
import { tr } from "@/lib/i18n/messages";
import { currentLanguageTag } from "@/lib/i18n";

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-10" : ""}
          data-testid={id}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Result({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-bold tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

const fmt = (v: number | null | undefined, suffix = "") =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${formatAmount(v, Math.abs(v) < 1 ? 4 : 2)}${suffix}`;

export function PercentTool() {
  const [a, setA] = React.useState({ p: "20", total: "150" });
  const [b, setB] = React.useState({ part: "30", total: "150" });
  const [c, setC] = React.useState({ from: "80", to: "100" });
  const [d, setD] = React.useState({ value: "100", p: "-30" });
  const [e, setE] = React.useState({ value: "120", p: "20" });
  const n = parseNumber;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolPanel className="space-y-3">
        <h2 className="font-heading text-base font-bold">{tr("Calculer X % d'un nombre")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="pct-a-p"
            label={tr("Pourcentage")}
            value={a.p}
            onChange={(v) => setA({ ...a, p: v })}
            suffix="%"
          />
          <NumberField
            id="pct-a-total"
            label={tr("de")}
            value={a.total}
            onChange={(v) => setA({ ...a, total: v })}
          />
        </div>
        <Result
          label={tr("Résultat")}
          value={fmt(
            n(a.p) !== null && n(a.total) !== null ? percentOf(n(a.p)!, n(a.total)!) : null,
          )}
          testId="pct-a-result"
        />
      </ToolPanel>
      <ToolPanel className="space-y-3">
        <h2 className="font-heading text-base font-bold">
          {tr("X représente quel pourcentage de Y ?")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="pct-b-part"
            label={tr("Valeur")}
            value={b.part}
            onChange={(v) => setB({ ...b, part: v })}
          />
          <NumberField
            id="pct-b-total"
            label={tr("sur un total de")}
            value={b.total}
            onChange={(v) => setB({ ...b, total: v })}
          />
        </div>
        <Result
          label={tr("Pourcentage")}
          value={fmt(
            n(b.part) !== null && n(b.total) !== null ? whatPercent(n(b.part)!, n(b.total)!) : null,
            " %",
          )}
          testId="pct-b-result"
        />
      </ToolPanel>
      <ToolPanel className="space-y-3">
        <h2 className="font-heading text-base font-bold">{tr("Variation entre deux valeurs")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="pct-c-from"
            label={tr("Valeur de départ")}
            value={c.from}
            onChange={(v) => setC({ ...c, from: v })}
          />
          <NumberField
            id="pct-c-to"
            label={tr("Valeur d'arrivée")}
            value={c.to}
            onChange={(v) => setC({ ...c, to: v })}
          />
        </div>
        <Result
          label={tr("Évolution")}
          value={fmt(
            n(c.from) !== null && n(c.to) !== null ? percentChange(n(c.from)!, n(c.to)!) : null,
            " %",
          )}
          testId="pct-c-result"
        />
      </ToolPanel>
      <ToolPanel className="space-y-3">
        <h2 className="font-heading text-base font-bold">
          {tr("Appliquer une remise ou une hausse")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="pct-d-value"
            label={tr("Valeur")}
            value={d.value}
            onChange={(v) => setD({ ...d, value: v })}
          />
          <NumberField
            id="pct-d-p"
            label={tr("Variation (− pour une remise)")}
            value={d.p}
            onChange={(v) => setD({ ...d, p: v })}
            suffix="%"
          />
        </div>
        <Result
          label={tr("Nouvelle valeur")}
          value={fmt(
            n(d.value) !== null && n(d.p) !== null ? applyPercent(n(d.value)!, n(d.p)!) : null,
          )}
          testId="pct-d-result"
        />
      </ToolPanel>
      <ToolPanel className="space-y-3 md:col-span-2">
        <h2 className="font-heading text-base font-bold">
          {tr("Retrouver la valeur avant une variation")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            id="pct-e-value"
            label={tr("Valeur après variation")}
            value={e.value}
            onChange={(v) => setE({ ...e, value: v })}
          />
          <NumberField
            id="pct-e-p"
            label={tr("Variation appliquée")}
            value={e.p}
            onChange={(v) => setE({ ...e, p: v })}
            suffix="%"
          />
          <Result
            label={tr("Valeur d'origine")}
            value={fmt(
              n(e.value) !== null && n(e.p) !== null ? beforePercent(n(e.value)!, n(e.p)!) : null,
            )}
            testId="pct-e-result"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {tr(
            "Exemple : un prix de 120 € après +20 % de TVA correspond à 100 € HT. Les nombres acceptent la virgule ou le point.",
          )}
        </p>
      </ToolPanel>
    </div>
  );
}

type VatMode = "ht" | "ttc" | "tva";

export function VatTool() {
  const [mode, setMode] = React.useState<VatMode>("ht");
  const [amount, setAmount] = React.useState("100");
  const [rate, setRate] = React.useState("20");
  const [custom, setCustom] = React.useState("");
  const value = parseNumber(amount);
  const rateValue = rate === "custom" ? parseNumber(custom) : Number(rate);
  const breakdown =
    value !== null && rateValue !== null
      ? mode === "ht"
        ? vatFromHt(value, rateValue)
        : mode === "ttc"
          ? vatFromTtc(value, rateValue)
          : vatFromAmount(value, rateValue)
      : null;

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-4">
        <Segmented
          label={tr("Montant connu")}
          value={mode}
          onChange={setMode}
          options={[
            {
              value: "ht",
              label: tr("Hors taxes (HT)"),
              shortLabel: tr("HT"),
              description: tr("Je connais le HT"),
            },
            {
              value: "ttc",
              label: tr("Toutes taxes (TTC)"),
              shortLabel: tr("TTC"),
              description: tr("Je connais le TTC"),
            },
            {
              value: "tva",
              label: tr("Montant de TVA"),
              shortLabel: tr("TVA"),
              description: tr("Je connais la TVA"),
            },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            id="vat-amount"
            label={
              mode === "ht"
                ? tr("Montant HT")
                : mode === "ttc"
                  ? tr("Montant TTC")
                  : tr("Montant de TVA")
            }
            value={amount}
            onChange={setAmount}
            suffix="€"
          />
          <div className="space-y-1">
            <Label htmlFor="vat-rate">{tr("Taux de TVA")}</Label>
            <Select value={rate} onValueChange={setRate}>
              <SelectTrigger id="vat-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRENCH_VAT_RATES.map((r) => (
                  <SelectItem key={r.rate} value={String(r.rate)}>
                    {r.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{tr("Autre taux…")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rate === "custom" ? (
            <NumberField
              id="vat-custom"
              label={tr("Taux personnalisé")}
              value={custom}
              onChange={setCustom}
              suffix="%"
            />
          ) : null}
        </div>
      </ToolPanel>
      <div className="grid gap-3 sm:grid-cols-3" data-testid="vat-results">
        <Result label={tr("Hors taxes (HT)")} value={fmt(breakdown?.ht, " €")} testId="vat-ht" />
        <Result
          label={tr("TVA ({rate} %)", { rate: rateValue ?? "—" })}
          value={fmt(breakdown?.tva, " €")}
          testId="vat-tva"
        />
        <Result
          label={tr("Toutes taxes (TTC)")}
          value={fmt(breakdown?.ttc, " €")}
          testId="vat-ttc"
        />
      </div>
      {value !== null ? (
        <ToolPanel className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ArrowLeftRight className="size-4" aria-hidden="true" />{" "}
            {mode === "ht"
              ? tr("Comparaison des taux français pour {amount} € HT", {
                  amount: formatAmount(value),
                })
              : mode === "ttc"
                ? tr("Comparaison des taux français pour {amount} € TTC", {
                    amount: formatAmount(value),
                  })
                : tr("Comparaison des taux français pour {amount} € de TVA", {
                    amount: formatAmount(value),
                  })}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1 font-semibold">{tr("Taux")}</th>
                <th className="py-1 text-right font-semibold">{tr("HT")}</th>
                <th className="py-1 text-right font-semibold">{tr("TVA")}</th>
                <th className="py-1 text-right font-semibold">{tr("TTC")}</th>
              </tr>
            </thead>
            <tbody>
              {FRENCH_VAT_RATES.map((r) => {
                const row =
                  mode === "ht"
                    ? vatFromHt(value, r.rate)
                    : mode === "ttc"
                      ? vatFromTtc(value, r.rate)
                      : vatFromAmount(value, r.rate);
                return (
                  <tr key={r.rate} className="border-b border-border/60 tabular-nums">
                    <td className="py-1">{r.rate.toLocaleString(currentLanguageTag())} %</td>
                    <td className="py-1 text-right">{fmt(row?.ht)}</td>
                    <td className="py-1 text-right">{fmt(row?.tva)}</td>
                    <td className="py-1 text-right">{fmt(row?.ttc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ToolPanel>
      ) : null}
    </div>
  );
}
