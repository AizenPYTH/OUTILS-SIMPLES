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
        aria-label={`${t.common.back} : fermer le document`}
        data-testid="editor-close"
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight" title={fileName}>
          {fileName}
          {dirty ? <span className="text-muted-foreground"> · modifié</span> : null}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
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
      <Button type="button" size="sm" onClick={onExport} data-testid="editor-download">
        <Download aria-hidden="true" />
        <span className="hidden sm:inline">Télécharger le PDF modifié</span>
        <span className="sm:hidden">{t.common.download}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Autres actions"
            data-testid="editor-menu"
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
            {fileName}
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
