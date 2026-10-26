"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { DownloadTextButton } from "./download-text-button";

interface TextInputPanelProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accept a .txt/.md/.csv/.json file as input. */
  acceptFile?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  hint?: string;
}

/** Text input area with paste/file import and clear; used by every text/dev tool. */
export function TextInputPanel({
  id,
  label,
  value,
  onChange,
  placeholder,
  acceptFile = ".txt,.md,.csv,.json,.xml,.html,text/plain",
  maxLength = 2_000_000,
  rows = 10,
  className,
  hint,
}: TextInputPanelProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxLength) {
      setFileError(`Fichier trop volumineux (maximum ${Math.round(maxLength / 1_000_000)} Mo).`);
      return;
    }
    setFileError(null);
    onChange(await file.text());
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden="true" /> Importer un fichier
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={acceptFile}
            className="sr-only"
            tabIndex={-1}
            aria-label="Importer un fichier texte"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            disabled={!value}
            aria-label="Effacer"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className="font-mono text-[13px] leading-relaxed"
        maxLength={maxLength}
        data-testid={`${id}-input`}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {fileError ? (
        <p role="alert" className="text-xs text-destructive">
          {fileError}
        </p>
      ) : null}
    </div>
  );
}

interface TextOutputPanelProps {
  id: string;
  label: string;
  value: string;
  filename: string;
  mimeType?: string;
  toolId?: string;
  rows?: number;
  className?: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  emptyHint?: string;
}

export function TextOutputPanel({
  id,
  label,
  value,
  filename,
  mimeType,
  toolId,
  rows = 10,
  className,
  editable = false,
  onChange,
  children,
  emptyHint = "Le résultat apparaîtra ici.",
}: TextOutputPanelProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1">
          {children}
          <CopyButton text={value} />
          <DownloadTextButton
            text={value}
            filename={filename}
            mimeType={mimeType}
            toolId={toolId}
          />
        </div>
      </div>
      <Textarea
        id={id}
        value={value}
        readOnly={!editable}
        onChange={editable && onChange ? (e) => onChange(e.target.value) : undefined}
        rows={rows}
        spellCheck={false}
        placeholder={emptyHint}
        className={cn("font-mono text-[13px] leading-relaxed", !editable && "bg-muted/40")}
        data-testid={`${id}-output`}
        aria-live="polite"
      />
    </div>
  );
}
