"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { UNIT_CATEGORIES, convertUnit, formatConverted, getUnitCategory } from "@/lib/calc/units";
import { parseNumber } from "@/lib/calc/percent";

export function UnitsTool({ initialCategory = "length" }: { initialCategory?: string }) {
  const [categoryId, setCategoryId] = React.useState(initialCategory);
  const category = getUnitCategory(categoryId) ?? UNIT_CATEGORIES[0]!;
  const [value, setValue] = React.useState("1");
  const [from, setFrom] = React.useState(category.units[2]?.id ?? category.units[0]!.id);
  const [to, setTo] = React.useState(category.units[0]!.id);

  const changeCategory = (id: string) => {
    const next = getUnitCategory(id);
    if (!next) return;
    setCategoryId(id);
    setFrom(next.units[Math.min(2, next.units.length - 1)]!.id);
    setTo(next.units[0]!.id);
  };

  const number = parseNumber(value);
  const result = number !== null ? convertUnit(category.id, number, from, to) : null;
  const fromUnit = category.units.find((u) => u.id === from);
  const toUnit = category.units.find((u) => u.id === to);

  return (
    <div className="space-y-4">
      <ToolPanel className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="units-category">Grandeur</Label>
          <Select value={category.id} onValueChange={changeCategory}>
            <SelectTrigger id="units-category" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_1fr] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="units-value">Valeur</Label>
            <Input
              id="units-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              data-testid="units-value"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="units-from">De</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger id="units-from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label} ({u.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Inverser les unités"
            onClick={() => (setFrom(to), setTo(from))}
            className="mb-0.5"
          >
            <ArrowLeftRight aria-hidden="true" />
          </Button>
          <div className="space-y-1">
            <Label htmlFor="units-to">Vers</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger id="units-to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label} ({u.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ToolPanel>
      <ToolPanel>
        <p className="text-xs text-muted-foreground">Résultat</p>
        <p
          className="font-heading text-2xl font-bold tabular-nums"
          data-testid="units-result"
          aria-live="polite"
        >
          {result === null ? "—" : `${formatConverted(result)} ${toUnit?.symbol ?? ""}`}
        </p>
        {number !== null && fromUnit ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatConverted(number)} {fromUnit.symbol} ={" "}
            {result === null ? "—" : formatConverted(result)} {toUnit?.symbol}
          </p>
        ) : null}
      </ToolPanel>
      {number !== null ? (
        <ToolPanel>
          <p className="mb-2 text-sm font-medium">
            {formatConverted(number)} {fromUnit?.symbol} dans toutes les unités
          </p>
          <table className="w-full text-sm">
            <tbody>
              {category.units
                .filter((u) => u.id !== from)
                .map((u) => (
                  <tr key={u.id} className="border-b border-border/60 tabular-nums">
                    <td className="py-1">{u.label}</td>
                    <td className="py-1 text-right font-mono">
                      {formatConverted(convertUnit(category.id, number, from, u.id) ?? Number.NaN)}{" "}
                      {u.symbol}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ToolPanel>
      ) : null}
    </div>
  );
}
