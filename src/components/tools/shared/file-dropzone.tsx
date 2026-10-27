"use client";

import * as React from "react";
import { FileUp, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { takeHandoff } from "@/lib/files/handoff";
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
  /** Error found by the tool after this pre-check, shown in the same inline alert. */
  error?: string | null;
  /** "outline" when another button of the tool is the main action (e.g. camera on phones). */
  buttonVariant?: "default" | "outline";
}

/** Generic accessible drop area (same look as the PDF dropzone) for images and text files. */
export function FileDropzone({
  onFiles,
  accept,
  validate,
  multiple = false,
  title,
  hint,
  buttonLabel,
  compact = false,
  disabled = false,
  className,
  capture,
  testId = "file-dropzone",
  error,
  buttonVariant,
}: FileDropzoneProps) {
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
    } else setInlineError(null);
    if (!multiple && accepted.length > 1) accepted.splice(1);
    if (accepted.length) onFiles(accepted);
    if (inputRef.current) inputRef.current.value = "";
  };
  React.useEffect(() => {
    handleRef.current = handle;
  });

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
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed text-center shadow-sm transition-[border-color,background-color,box-shadow]",
          compact ? "px-6 py-6" : "px-6 py-9 sm:py-16",
          dragActive
            ? "border-primary bg-primary-soft shadow-md"
            : "border-primary/40 bg-surface hover:border-primary/70 hover:bg-primary-soft/30",
          disabled && "opacity-60",
        )}
        data-testid={testId}
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
            {dragActive ? t.upload.dragActive : title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <Button
          type="button"
          size={compact ? "default" : "lg"}
          // "Add more" zones sit next to the tool's main action: outlined by default.
          variant={buttonVariant ?? (compact ? "outline" : "default")}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          data-testid={`${testId}-browse`}
        >
          {buttonLabel ?? (multiple ? t.upload.browseMultiple : t.upload.browse)}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          capture={capture}
          className="sr-only"
          tabIndex={-1}
          aria-label={buttonLabel ?? title}
          onChange={(e) => handle(e.target.files)}
          data-testid={`${testId}-input`}
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
