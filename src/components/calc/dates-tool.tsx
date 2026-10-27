"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Segmented } from "@/components/pdf/shared/segmented";
import { ToolPanel, StatGrid } from "@/components/tools/shared/tool-panel";
import {
  addBusinessDays,
  addDays,
  businessDaysBetween,
  durationBetween,
  formatDayFr,
  frenchPublicHolidays,
  parseDay,
  toIsoDay,
} from "@/lib/calc/dates";
import { tr } from "@/lib/i18n/messages";
import { currentLanguageTag } from "@/lib/i18n";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={id}
      />
    </div>
  );
}

export function DatesTool() {
  const [from, setFrom] = React.useState(todayIso);
  const [to, setTo] = React.useState(() => toIsoDay(addDays(parseDay(todayIso())!, 30)));
  const [holidays, setHolidays] = React.useState(true);
  const [alsace, setAlsace] = React.useState(false);
  const [start, setStart] = React.useState(todayIso);
  const [count, setCount] = React.useState("10");
  const [kind, setKind] = React.useState<"calendar" | "business">("business");
  const [year, setYear] = React.useState(() => String(new Date().getFullYear()));

  const a = parseDay(from);
  const b = parseDay(to);
  const duration = a && b ? durationBetween(a, b) : null;
  const business =
    a && b ? businessDaysBetween(a, b, { excludeHolidays: holidays, alsaceMoselle: alsace }) : null;
  const startDay = parseDay(start);
  const n = Number(count);
  const target =
    startDay && Number.isFinite(n)
      ? kind === "calendar"
        ? addDays(startDay, n)
        : addBusinessDays(startDay, n, { excludeHolidays: holidays, alsaceMoselle: alsace })
      : null;
  const yearNumber = Number(year);
  const list =
    Number.isInteger(yearNumber) && yearNumber > 1900 && yearNumber < 2200
      ? frenchPublicHolidays(yearNumber, alsace)
      : [];

  const options = (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <label className="flex items-center gap-2">
        <Checkbox checked={holidays} onCheckedChange={(v) => setHolidays(v === true)} />{" "}
        {tr("Exclure les jours fériés français")}
      </label>
      <label className="flex items-center gap-2">
        <Checkbox checked={alsace} onCheckedChange={(v) => setAlsace(v === true)} />{" "}
        {tr("Alsace-Moselle (Vendredi saint, Saint-Étienne)")}
      </label>
    </div>
  );

  return (
    <Tabs defaultValue="between" className="space-y-4">
      <TabsList>
        <TabsTrigger value="between">{tr("Durée entre deux dates")}</TabsTrigger>
        <TabsTrigger value="add">{tr("Ajouter des jours")}</TabsTrigger>
        <TabsTrigger value="holidays">{tr("Jours fériés")}</TabsTrigger>
      </TabsList>
      <TabsContent value="between" className="space-y-4">
        <ToolPanel className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField
              id="dates-from"
              label={tr("Date de début")}
              value={from}
              onChange={setFrom}
            />
            <DateField
              id="dates-to"
              label={tr("Date de fin (incluse dans les jours ouvrés)")}
              value={to}
              onChange={setTo}
            />
          </div>
          {options}
        </ToolPanel>
        {duration && business ? (
          <>
            <StatGrid
              items={[
                {
                  label: tr("Durée"),
                  value: [
                    duration.years > 1
                      ? tr("{n} ans", { n: duration.years })
                      : tr("{n} an", { n: duration.years }),
                    tr("{n} mois", { n: duration.months }),
                    tr("{n} j", { n: duration.days }),
                  ].join(" "),
                  hint: duration.negative ? tr("La date de fin précède le début") : undefined,
                },
                {
                  label: tr("Jours calendaires"),
                  value: duration.totalDays.toLocaleString(currentLanguageTag()),
                },
                {
                  label: tr("Semaines"),
                  value: tr("{w} sem. {d} j", {
                    w: duration.totalWeeks,
                    d: duration.remainingDaysAfterWeeks,
                  }),
                },
                {
                  label: tr("Jours ouvrés"),
                  value: business.businessDays.toLocaleString(currentLanguageTag()),
                },
              ]}
            />
            <ToolPanel className="space-y-2 text-sm" data-testid="dates-detail">
              <p>
                {tr("Du")} <strong>{formatDayFr(a!)}</strong> {tr("au")}{" "}
                <strong>{formatDayFr(b!)}</strong>
                {duration.negative ? " " + tr("(ordre inversé)") : ""}
                {business.weekendDays > 1
                  ? tr(" : {n} jours de week-end", { n: business.weekendDays })
                  : tr(" : {n} jour de week-end", { n: business.weekendDays })}
                {!holidays
                  ? ""
                  : business.holidays.length > 1
                    ? tr(" et {n} jours fériés en semaine", { n: business.holidays.length })
                    : tr(" et {n} jour férié en semaine", { n: business.holidays.length })}
                .
              </p>
              {business.holidays.length ? (
                <p className="text-muted-foreground">
                  {tr("Fériés comptés :")}{" "}
                  {business.holidays
                    .map(
                      (h) =>
                        `${h.name} (${formatDayFr(h.date, { day: "numeric", month: "short" })})`,
                    )
                    .join(", ")}
                  .
                </p>
              ) : null}
            </ToolPanel>
          </>
        ) : (
          <p className="text-sm text-destructive">{tr("Saisissez deux dates valides.")}</p>
        )}
      </TabsContent>
      <TabsContent value="add" className="space-y-4">
        <ToolPanel className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField
              id="dates-start"
              label={tr("À partir du")}
              value={start}
              onChange={setStart}
            />
            <div className="space-y-1">
              <Label htmlFor="dates-count">{tr("Nombre de jours (négatif pour reculer)")}</Label>
              <Input
                id="dates-count"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                data-testid="dates-count"
              />
            </div>
          </div>
          <Segmented
            label={tr("Type de jours")}
            value={kind}
            onChange={setKind}
            className="sm:grid-cols-2"
            options={[
              {
                value: "business",
                label: tr("Jours ouvrés"),
                description: tr("Lundi à vendredi, fériés exclus"),
              },
              {
                value: "calendar",
                label: tr("Jours calendaires"),
                description: tr("Tous les jours"),
              },
            ]}
          />
          {kind === "business" ? options : null}
        </ToolPanel>
        {target ? (
          <ToolPanel>
            <p className="text-xs text-muted-foreground">{tr("Date obtenue")}</p>
            <p className="font-heading text-xl font-bold" data-testid="dates-target">
              {formatDayFr(target)}
            </p>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{toIsoDay(target)}</p>
          </ToolPanel>
        ) : (
          <p className="text-sm text-destructive">
            {tr("Saisissez une date et un nombre valides.")}
          </p>
        )}
      </TabsContent>
      <TabsContent value="holidays" className="space-y-4">
        <ToolPanel className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="dates-year">{tr("Année")}</Label>
              <Input
                id="dates-year"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                data-testid="dates-year"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox checked={alsace} onCheckedChange={(v) => setAlsace(v === true)} />{" "}
              Alsace-Moselle
            </label>
          </div>
          {list.length ? (
            <ul className="divide-y divide-border/60 text-sm" data-testid="holiday-list">
              {list.map((h) => (
                <li
                  key={h.name + toIsoDay(h.date)}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <span>{h.name}</span>
                  <span className="text-muted-foreground">{formatDayFr(h.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-destructive">{tr("Année invalide.")}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {tr(
              "Jours fériés légaux en France métropolitaine (Pâques calculée par l'algorithme de Meeus). Les ponts et jours spécifiques à une convention collective ne sont pas pris en compte.",
            )}
          </p>
        </ToolPanel>
      </TabsContent>
    </Tabs>
  );
}
