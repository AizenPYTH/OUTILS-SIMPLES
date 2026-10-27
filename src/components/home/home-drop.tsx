"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileUp, Loader2, X } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { DETECT_HEAD_BYTES, detectFileKind, KIND_TOOLS, type FileKind } from "@/lib/files/detect";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/routes";
import { formatBytes } from "@/lib/files/format";
import { setHandoff } from "@/lib/files/handoff";
import type { SlimTool } from "@/lib/tools/search-index";
import { cn } from "@/lib/utils";

interface HomeDropProps {
  /** Slim data for every tool that can be suggested (built on the server). */
  tools: Record<string, SlimTool>;
}

interface Detected {
  file: File;
  kind: FileKind;
}

/**
 * The home page drop zone: any file, type detected from its first bytes, then
 * the matching tools are proposed and the file travels with the visitor to the
 * tool they pick (src/lib/files/handoff.ts). Nothing is read beyond 64 KiB
 * here and nothing leaves the browser.
 */
function noteFor(kind: FileKind): string | null {
  const notes = t.homeDrop.notes as Partial<Record<FileKind, string>>;
  return notes[kind] ?? null;
}

export function HomeDrop({ tools }: HomeDropProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [detected, setDetected] = React.useState<Detected | null>(null);

  const inspect = async (file: File) => {
    setBusy(true);
    try {
      const head = new Uint8Array(await file.slice(0, DETECT_HEAD_BYTES).arrayBuffer());
      setDetected({ file, kind: detectFileKind(file.name, head) });
    } catch {
      setDetected({ file, kind: "unknown" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const choose = (tool: SlimTool) => {
    if (detected) setHandoff(detected.file);
    router.push(tool.path);
  };

  const suggestions = detected
    ? KIND_TOOLS[detected.kind]
        .map((id) => tools[id])
        .filter((tool): tool is SlimTool => Boolean(tool))
    : [];

  return (
    <div className="mx-auto max-w-2xl" data-testid="home-drop">
      <div
        role="group"
        aria-label={t.homeDrop.region}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files[0];
          if (file) void inspect(file);
        }}
        className={cn(
          "relative rounded-[20px] border-2 border-dashed bg-surface/80 p-5 text-center shadow-md backdrop-blur transition-colors sm:p-7",
          dragActive ? "border-primary bg-primary-soft/60" : "border-border",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void inspect(file);
          }}
          data-testid="home-drop-input"
          aria-label={t.homeDrop.chooseFile}
        />
        {!detected ? (
          <>
            <FileUp className="mx-auto size-8 text-primary" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold sm:text-lg">{t.homeDrop.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.homeDrop.hint}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-60"
              data-testid="home-drop-browse"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {t.homeDrop.browse}
            </button>
          </>
        ) : (
          <div className="text-left" data-testid="home-drop-result">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{detected.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  <span data-testid="home-drop-kind">{t.homeDrop.kinds[detected.kind]}</span> ·{" "}
                  {formatBytes(detected.file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetected(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={t.homeDrop.remove}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {suggestions.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="home-drop-suggestions">
                {suggestions.map((tool, index) => (
                  <li key={tool.id}>
                    <button
                      type="button"
                      onClick={() => choose(tool)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                        index === 0
                          ? "border-primary bg-primary-soft/40"
                          : "border-border bg-surface",
                      )}
                      data-testid="home-drop-suggestion"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-accent-foreground">
                        <ToolIcon name={tool.icon} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{tool.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {tool.shortDescription}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {noteFor(detected.kind) ? (
              <p className="mt-3 text-sm text-muted-foreground" role="status">
                {noteFor(detected.kind)}
              </p>
            ) : null}
            {suggestions.length === 0 ? (
              <Link
                href={localizedPath("/outils/")}
                className="mt-2 inline-block text-sm font-medium text-link hover:underline"
              >
                {t.homeDrop.browseAll}
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
