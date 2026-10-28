"use client";

import * as React from "react";
import { FileUp, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { takeHandoff } from "@/lib/files/handoff";
import { cn } from "@/lib/utils";
import { orDrop } from "./or-drop";
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
          "flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed text-center transition-[border-color,background-color,box-shadow]",
          compact ? "gap-4 px-6 py-6" : "gap-3 px-5 py-10 sm:py-16",
          dragActive
            ? "border-accent bg-primary-soft shadow-md"
            : compact
              ? "border-border bg-surface hover:border-accent"
              : "border-border bg-surface/70 hover:border-accent hover:bg-surface",
          disabled && "opacity-60",
        )}
        data-testid={testId}
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
                {dragActive ? t.upload.dragActive : title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
            </div>
          </>
        ) : null}
        <Button
          type="button"
          size={compact ? "default" : "lg"}
          // "Add more" zones sit next to the tool's main action: outlined.
          variant={buttonVariant ?? (compact ? "outline" : "default")}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={
            compact
              ? undefined
              : "h-16 w-full max-w-[380px] gap-3 rounded-[14px] px-8 text-lg font-bold shadow-lg sm:h-[72px] sm:text-xl"
          }
          data-testid={`${testId}-browse`}
        >
          {compact ? null : <Upload className="size-6" aria-hidden="true" />}
          {buttonLabel ?? (multiple ? t.upload.browseMultiple : t.upload.browse)}
        </Button>
        {compact ? null : (
          <div>
            <p className="text-base font-medium text-foreground/80">
              {dragActive ? t.upload.dragActive : orDrop(title)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
          </div>
        )}
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
