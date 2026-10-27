"use client";

import * as React from "react";
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
import { slugify } from "@/lib/text/transform";
import { tr } from "@/lib/i18n/messages";

type Separator = "-" | "_" | ".";

export function SlugTool() {
  const [text, setText] = React.useState("");
  const [separator, setSeparator] = React.useState<Separator>("-");
  const [maxLength, setMaxLength] = React.useState<"0" | "50" | "75" | "100">("0");

  const output = React.useMemo(() => {
    const limit = Number(maxLength);
    return text
      .split("\n")
      .map((line) => {
        let slug = slugify(line, separator);
        if (limit && slug.length > limit) {
          slug = slug.slice(0, limit);
          const cut = slug.lastIndexOf(separator);
          if (cut > limit * 0.6) slug = slug.slice(0, cut);
        }
        return slug;
      })
      .join("\n")
      .replace(/\n+$/, "");
  }, [text, separator, maxLength]);

  return (
    <div className="space-y-4">
      <TextInputPanel
        id="slug-input"
        label={tr("Titre(s) à transformer (un par ligne)")}
        value={text}
        onChange={setText}
        placeholder={tr("Été 2026 : les 10 meilleurs outils PDF gratuits !")}
        rows={5}
        hint={tr("Accents retirés, minuscules, ponctuation remplacée par le séparateur.")}
      />
      <ToolPanel className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="slug-separator">{tr("Séparateur")}</Label>
          <Select value={separator} onValueChange={(v) => setSeparator(v as Separator)}>
            <SelectTrigger id="slug-separator" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">{tr("Tiret (-) recommandé")}</SelectItem>
              <SelectItem value="_">{tr("Tiret bas (_)")}</SelectItem>
              <SelectItem value=".">{tr("Point (.)")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="slug-max">{tr("Longueur maximale")}</Label>
          <Select value={maxLength} onValueChange={(v) => setMaxLength(v as typeof maxLength)}>
            <SelectTrigger id="slug-max" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{tr("Sans limite")}</SelectItem>
              <SelectItem value="50">{tr("50 caractères")}</SelectItem>
              <SelectItem value="75">{tr("75 caractères")}</SelectItem>
              <SelectItem value="100">{tr("100 caractères")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ToolPanel>
      <TextOutputPanel
        id="slug-output"
        label="Slug"
        value={output}
        filename="slugs.txt"
        rows={5}
        toolId="text-slug"
      />
    </div>
  );
}
