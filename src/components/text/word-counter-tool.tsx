"use client";

import * as React from "react";
import { TextInputPanel } from "@/components/tools/shared/text-io";
import { StatGrid, ToolPanel } from "@/components/tools/shared/tool-panel";
import { computeTextStats } from "@/lib/text/stats";
import { formatNumber } from "@/lib/files/format";
import { tr } from "@/lib/i18n/messages";

export function WordCounterTool() {
  const [text, setText] = React.useState("");
  const stats = React.useMemo(() => computeTextStats(text), [text]);
  const minutes = (m: number) => (m === 0 ? "0 min" : m < 1 ? "< 1 min" : `${formatNumber(m)} min`);
  return (
    <div className="space-y-4">
      <TextInputPanel
        id="word-counter"
        label={tr("Votre texte")}
        value={text}
        onChange={setText}
        placeholder={tr("Collez ou saisissez votre texte…")}
        rows={12}
      />
      <ToolPanel>
        <StatGrid
          items={[
            { label: tr("Mots"), value: formatNumber(stats.words) },
            { label: tr("Caractères"), value: formatNumber(stats.characters) },
            { label: tr("Sans espaces"), value: formatNumber(stats.charactersNoSpaces) },
            { label: tr("Phrases"), value: formatNumber(stats.sentences) },
            { label: tr("Paragraphes"), value: formatNumber(stats.paragraphs) },
            { label: tr("Lignes"), value: formatNumber(stats.lines) },
            { label: tr("Lecture (200 mots/min)"), value: minutes(stats.readingMinutes) },
            { label: tr("Oral (130 mots/min)"), value: minutes(stats.speakingMinutes) },
          ]}
        />
        {stats.topWords.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">{tr("Mots les plus fréquents")}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="top-words">
              {stats.topWords.map((w) => (
                <li
                  key={w.word}
                  className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs"
                >
                  {w.word} <span className="text-muted-foreground">×{w.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ToolPanel>
    </div>
  );
}
