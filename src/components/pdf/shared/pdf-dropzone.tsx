"use client";

import * as React from "react";
import { FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/files/format";
import { validatePdfFileMeta } from "@/lib/files/validation";
import { isPdfError } from "@/lib/pdf/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
}: PdfDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [inlineError, setInlineError] = React.useState<string | null>(null);

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
      for (const message of rejected) toast.error(message);
    } else {
      setInlineError(null);
    }
    if (!multiple && accepted.length > 1) accepted.splice(1);
    if (accepted.length) onFiles(accepted);
    if (inputRef.current) inputRef.current.value = "";
  };

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
          "flex flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed text-center transition-colors",
          compact ? "px-6 py-6" : "px-6 py-9 sm:py-16",
          dragActive ? "border-primary bg-primary-soft" : "border-border bg-surface",
          disabled && "opacity-60",
        )}
        data-testid="pdf-dropzone"
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-[14px] bg-primary-soft text-link",
            compact ? "size-10" : "size-14",
          )}
        >
          {dragActive ? (
            <FileUp className={compact ? "size-5" : "size-7"} aria-hidden="true" />
          ) : (
            <Upload className={compact ? "size-5" : "size-7"} aria-hidden="true" />
          )}
        </span>
        <div>
          <p className={cn("font-heading font-bold", compact ? "text-base" : "text-xl")}>
            {dragActive
              ? t.upload.dragActive
              : (title ?? (multiple ? t.upload.dropTitleMultiple : t.upload.dropTitle))}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <Button
          type="button"
          size={compact ? "default" : "lg"}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          data-testid="pdf-browse"
        >
          {multiple ? (compact ? t.upload.addMore : t.upload.browseMultiple) : t.upload.browse}
        </Button>
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
      {inlineError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {inlineError}
        </p>
      ) : null}
    </div>
  );
}
