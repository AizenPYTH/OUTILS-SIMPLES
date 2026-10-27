"use client";

import { Download } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { triggerDownload } from "@/lib/files/download";
import { track } from "@/lib/analytics/events";
import { tr } from "@/lib/i18n/messages";

interface DownloadTextButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  text: string;
  filename: string;
  mimeType?: string;
  label?: string;
  toolId?: string;
}

export function DownloadTextButton({
  text,
  filename,
  mimeType = "text/plain;charset=utf-8",
  label,
  toolId,
  ...props
}: DownloadTextButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!text}
      onClick={() => {
        triggerDownload(new Blob([text], { type: mimeType }), filename);
        if (toolId) track("tool_download", { tool: toolId });
      }}
      {...props}
      data-testid="download-text-button"
    >
      <Download aria-hidden="true" />
      {label ?? tr("Télécharger")}
    </Button>
  );
}
