"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { generateUuid } from "@/lib/dev/random";
import { track } from "@/lib/analytics/events";

const TOOL_ID = "dev-uuid";

interface Options {
  count: number;
  uppercase: boolean;
  braces: boolean;
  noHyphens: boolean;
}

function format(uuid: string, o: Options): string {
  let out = o.noHyphens ? uuid.replace(/-/g, "") : uuid;
  if (o.uppercase) out = out.toUpperCase();
  return o.braces ? `{${out}}` : out;
}

export function UuidTool() {
  const [options, setOptions] = React.useState<Options>({
    count: 5,
    uppercase: false,
    braces: false,
    noHyphens: false,
  });
  const [raw, setRaw] = React.useState<string[]>(() =>
    Array.from({ length: 5 }, () => generateUuid()),
  );
  const patch = (p: Partial<Options>) => setOptions((o) => ({ ...o, ...p }));

  const regenerate = (count = options.count) => {
    setRaw(Array.from({ length: count }, () => generateUuid()));
    track("tool_success", { tool: TOOL_ID, resultCount: count });
  };

  const output = raw
    .slice(0, options.count)
    .map((u) => format(u, options))
    .join("\n");

  return (
    <div className="space-y-4">
      <ToolPanel className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="uuid-count">Nombre</Label>
          <Select
            value={String(options.count)}
            onValueChange={(v) => {
              const count = Number(v);
              patch({ count });
              if (count > raw.length) regenerate(count);
            }}
          >
            <SelectTrigger id="uuid-count" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 5, 10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={options.uppercase}
            onCheckedChange={(v) => patch({ uppercase: v === true })}
          />{" "}
          MAJUSCULES
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={options.braces}
            onCheckedChange={(v) => patch({ braces: v === true })}
          />{" "}
          Accolades {"{ }"}
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={options.noHyphens}
            onCheckedChange={(v) => patch({ noHyphens: v === true })}
          />{" "}
          Sans tirets
        </label>
        <Button type="button" onClick={() => regenerate()} data-testid="uuid-regenerate">
          <RefreshCw aria-hidden="true" /> Régénérer
        </Button>
      </ToolPanel>
      <TextOutputPanel
        id="uuid-output"
        label={`UUID v4 (${options.count})`}
        value={output}
        filename="uuid.txt"
        rows={Math.min(12, options.count + 1)}
        toolId={TOOL_ID}
      />
      <p className="text-xs text-muted-foreground">
        Générés avec l&apos;API Web Crypto de votre navigateur (aléatoire cryptographique), version
        4, variante RFC 4122. Rien n&apos;est conservé.
      </p>
    </div>
  );
}
