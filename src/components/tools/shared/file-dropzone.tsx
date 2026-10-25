"use client";

import * as React from "react";
import { FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept: string;
  /** Returns an error message to reject a file, or null to accept it. */
  validate?: (file: File) => string | null;
  multiple?: boolean;
  title: string;
  hint: string;
  buttonLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  /** Mobile camera capture hint for image inputs. */
  capture?: "environment" | "user";
  testId?: string;
}

/** Generic accessible drop area (same look as the PDF dropzone) for images and text files. */
export function FileDropzone({ onFiles, accept, validate, multiple = false, title, hint, buttonLabel, compact = false, disabled = false, className, capture, testId = "file-dropzone" }: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [inlineError, setInlineError] = React.useState<string | null>(null);

  const handle = (list: FileList | File[] | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(list)) {
      const error = validate?.(file) ?? null;
      if (error) rejected.push(`${file.name} : ${error}`);
      else accepted.push(file);
    }
    if (rejected.length) {
      setInlineError(rejected.join(" · "));
      for (const message of rejected) toast.error(message);
    } else setInlineError(null);
    if (!multiple && accepted.length > 1) accepted.splice(1);
    if (accepted.length) onFiles(accepted);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <div
        role="group"
        aria-label={title}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) handle(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed text-center transition-colors", compact ? "px-6 py-6" : "px-6 py-9 sm:py-16", dragActive ? "border-primary bg-primary-soft" : "border-border bg-surface", disabled && "opacity-60")}
        data-testid={testId}
      >
        <span className={cn("flex items-center justify-center rounded-[14px] bg-primary-soft text-link", compact ? "size-10" : "size-14")}>
          {dragActive ? <FileUp className={compact ? "size-5" : "size-7"} aria-hidden="true" /> : <Upload className={compact ? "size-5" : "size-7"} aria-hidden="true" />}
        </span>
        <div>
          <p className={cn("font-heading font-bold", compact ? "text-base" : "text-xl")}>{dragActive ? t.upload.dragActive : title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <Button type="button" size={compact ? "default" : "lg"} onClick={() => inputRef.current?.click()} disabled={disabled} data-testid={`${testId}-browse`}>
          {buttonLabel ?? (multiple ? t.upload.browseMultiple : t.upload.browse)}
        </Button>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} capture={capture} className="sr-only" tabIndex={-1} aria-label={buttonLabel ?? title} onChange={(e) => handle(e.target.files)} data-testid={`${testId}-input`} />
      </div>
      {inlineError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {inlineError}
        </p>
      ) : null}
    </div>
  );
}
