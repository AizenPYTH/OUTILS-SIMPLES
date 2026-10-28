"use client";

import * as React from "react";
import { FileUp, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/files/format";
import { takeHandoff } from "@/lib/files/handoff";
import { validatePdfFileMeta } from "@/lib/files/validation";
import { isPdfError } from "@/lib/pdf/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { orDrop } from "@/components/tools/shared/or-drop";

interface PdfDropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  maxFileSizeBytes: number;
  maxFileCount?: number;
  /** Compact variant used to add more files to an existing list. */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  /**
   * Error found by the tool after this pre-check (unreadable or protected
   * file, duplicate…), shown in the same inline alert: one notification per
   * problem, next to where the file was dropped.
   */
  error?: string | null;
}

/**
 * Accessible drop area (handoff: dashed 2px, radius 24, padding 64/36,
 * 52px primary button). Files are pre-validated (size, declared type) here;
 * the content signature is checked when bytes are read.
 */
export function PdfDropzone({
  onFiles,
  multiple = false,
  maxFileSizeBytes,
  maxFileCount,
  compact = false,
  disabled = false,
  className,
  title,
  error,
}: PdfDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const handleRef = React.useRef<(list: FileList | File[] | null) => void>(() => {});

  // A file dropped on the home page arrives here (src/lib/files/handoff.ts).
  React.useEffect(() => {
    if (disabled || compact) return;
    const id = window.setTimeout(() => {
      const file = takeHandoff();
      if (file) handleRef.current([file]);
    }, 0);
    return () => window.clearTimeout(id);
  }, [disabled, compact]);

  const handleFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      try {
        validatePdfFileMeta(file, { maxFileSizeBytes });
        accepted.push(file);
      } catch (error) {
        rejected.push(
          t.upload.fileRejected(file.name, isPdfError(error) ? error.message : t.errors.notPdf),
        );
      }
    }
    if (rejected.length) {
      setInlineError(rejected.join(" · "));
    } else {
      setInlineError(null);
    }
    if (!multiple && accepted.length > 1) accepted.splice(1);
    if (accepted.length) onFiles(accepted);
    if (inputRef.current) inputRef.current.value = "";
  };
  React.useEffect(() => {
    handleRef.current = handleFiles;
  });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const hint =
    multiple && maxFileCount
      ? t.upload.hintMultiple(formatBytes(maxFileSizeBytes), maxFileCount)
      : t.upload.hint(formatBytes(maxFileSizeBytes));

  return (
    <div className={className}>
      <div
        role="group"
        aria-label={title ?? (multiple ? t.upload.dropTitleMultiple : t.upload.dropTitle)}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed text-center transition-[border-color,background-color,box-shadow]",
          compact ? "gap-4 px-6 py-6" : "gap-3 px-5 py-10 sm:py-16",
          dragActive
            ? "border-accent bg-primary-soft shadow-md"
            : compact
              ? "border-border bg-surface hover:border-accent"
              : "border-border bg-surface/70 hover:border-accent hover:bg-surface",
          disabled && "opacity-60",
        )}
        data-testid="pdf-dropzone"
      >
        {compact ? (
          <>
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-primary-soft text-link">
              {dragActive ? (
                <FileUp className="size-5" aria-hidden="true" />
              ) : (
                <Upload className="size-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="font-heading text-base font-bold">
                {dragActive
                  ? t.upload.dragActive
                  : (title ?? (multiple ? t.upload.dropTitleMultiple : t.upload.dropTitle))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
            </div>
          </>
        ) : null}
        <Button
          type="button"
          size={compact ? "default" : "lg"}
          // "Add more" zones sit next to the tool's main action: outlined.
          variant={compact ? "outline" : "default"}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={
            compact
              ? undefined
              : "h-16 w-full max-w-[380px] gap-3 rounded-[14px] px-8 text-lg font-bold shadow-lg sm:h-[72px] sm:text-xl"
          }
          data-testid="pdf-browse"
        >
          {compact ? null : <Upload className="size-6" aria-hidden="true" />}
          {multiple ? (compact ? t.upload.addMore : t.upload.browseMultiple) : t.upload.browse}
        </Button>
        {compact ? null : (
          <div>
            <p className="text-base font-medium text-foreground/80">
              {dragActive
                ? t.upload.dragActive
                : orDrop(title ?? (multiple ? t.upload.dropTitleMultiple : t.upload.dropTitle))}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          aria-label={multiple ? t.upload.browseMultiple : t.upload.browse}
          data-testid="pdf-input"
          tabIndex={-1}
        />
      </div>
      {inlineError || error ? (
        <Alert variant="destructive" className="mt-3" data-testid="dropzone-error">
          {[inlineError, error].filter(Boolean).join(" · ")}
        </Alert>
      ) : null}
    </div>
  );
}
