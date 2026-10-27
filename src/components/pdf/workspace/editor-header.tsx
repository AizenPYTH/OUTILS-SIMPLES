"use client";

import * as React from "react";
import { ArrowLeft, Download, MoreHorizontal, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/messages";

export interface HeaderMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Start a new group before this item. */
  separator?: boolean;
}

export interface DocumentStatus {
  label: string;
  tone: "neutral" | "info" | "success" | "warning";
}

interface EditorHeaderProps {
  title: string;
  fileName: string;
  status: DocumentStatus;
  /** "2 éléments · 1 texte modifié" — read by tests and screen readers. */
  summary: string;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string;
  redoLabel: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClose: () => void;
  menu: HeaderMenuItem[];
}

const toneClass: Record<DocumentStatus["tone"], string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary-soft text-link",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
};

/** "rapport.final.pdf" → { base: "rapport.final", ext: ".pdf" } (no extension: ext is ""). */
function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || name.length - dot > 6) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

/** Compact header: back, document name and state, undo/redo, export, secondary menu. */
export function EditorHeader({
  title,
  fileName,
  status,
  summary,
  dirty,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onExport,
  onClose,
  menu,
}: EditorHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2 sm:gap-2 sm:px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label={t.common.back + " : " + tr("fermer le document")}
        data-testid="editor-close"
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1">
        {/* The extension stays visible when a long name is cut ("rapport-annu….pdf"). */}
        <p
          className="flex min-w-0 text-[13px] font-semibold leading-tight sm:text-sm"
          title={fileName}
          data-testid="editor-file-name"
        >
          <span className="truncate">{splitName(fileName).base}</span>
          <span className="shrink-0">{splitName(fileName).ext}</span>
          {dirty ? (
            <span className="shrink-0 text-muted-foreground"> · {tr("modifié")}</span>
          ) : null}
        </p>
        {/* On phones the state line is kept for screen readers and moves to the "⋯" menu. */}
        <p className="truncate text-[11px] leading-tight text-muted-foreground max-sm:sr-only">
          <span className="sr-only">{title} · </span>
          <span
            className={cn("rounded-full px-1.5 py-px font-medium", toneClass[status.tone])}
            data-testid="document-status"
          >
            {status.label}
          </span>
          <span className="ml-1.5" aria-live="polite" data-testid="editor-summary">
            {summary}
          </span>
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={canUndo ? `${t.common.undo} : ${undoLabel}` : t.common.undo}
        title={canUndo ? `${t.common.undo} : ${undoLabel}` : undefined}
        data-testid="undo"
      >
        <Undo2 aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={canRedo && redoLabel ? `${t.common.redo} : ${redoLabel}` : t.common.redo}
        title={canRedo && redoLabel ? `${t.common.redo} : ${redoLabel}` : undefined}
        data-testid="redo"
      >
        <Redo2 aria-hidden="true" />
      </Button>
      <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />
      {/* Icon-only on phones so that the file name stays readable; same name for all. */}
      <Button
        type="button"
        size="sm"
        onClick={onExport}
        aria-label={tr("Télécharger le PDF modifié")}
        title={tr("Télécharger le PDF modifié")}
        className="max-sm:size-9 max-sm:px-0"
        data-testid="editor-download"
      >
        <Download aria-hidden="true" />
        <span className="hidden sm:inline">{tr("Télécharger le PDF modifié")}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={tr("Autres actions")}
            data-testid="editor-menu"
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            <span className="block truncate font-medium text-foreground">{fileName}</span>
            <span className="mt-0.5 block truncate sm:hidden">
              {status.label} · {summary}
            </span>
          </DropdownMenuLabel>
          {menu.map((item) => (
            <React.Fragment key={item.id}>
              {item.separator ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onSelect={item.onSelect}
                disabled={item.disabled}
                className={cn(item.destructive && "text-destructive focus:text-destructive")}
                data-testid={`menu-${item.id}`}
              >
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
