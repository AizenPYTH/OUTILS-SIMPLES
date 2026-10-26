"use client";

import * as React from "react";
import { TextInputPanel } from "@/components/tools/shared/text-io";
import { StatGrid, ToolPanel } from "@/components/tools/shared/tool-panel";
import { computeTextStats } from "@/lib/text/stats";
import { formatNumber } from "@/lib/files/format";

export function WordCounterTool() {
  const [text, setText] = React.useState("");
  const stats = React.useMemo(() => computeTextStats(text), [text]);
  const minutes = (m: number) => (m === 0 ? "0 min" : m < 1 ? "< 1 min" : `${formatNumber(m)} min`);
  return (
    <div className="space-y-4">
      <TextInputPanel
        id="word-counter"
        label="Votre texte"
        value={text}
        onChange={setText}
        placeholder="Collez ou saisissez votre texte…"
        rows={12}
      />
      <ToolPanel>
        <StatGrid
          items={[
            { label: "Mots", value: formatNumber(stats.words) },
            { label: "Caractères", value: formatNumber(stats.characters) },
            { label: "Sans espaces", value: formatNumber(stats.charactersNoSpaces) },
            { label: "Phrases", value: formatNumber(stats.sentences) },
            { label: "Paragraphes", value: formatNumber(stats.paragraphs) },
            { label: "Lignes", value: formatNumber(stats.lines) },
            { label: "Lecture (200 mots/min)", value: minutes(stats.readingMinutes) },
            { label: "Oral (130 mots/min)", value: minutes(stats.speakingMinutes) },
          ]}
        />
        {stats.topWords.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Mots les plus fréquents</h3>
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
