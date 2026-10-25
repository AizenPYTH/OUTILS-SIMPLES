"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyButton({ text, label = "Copier", ...props }: { text: string; label?: string } & Omit<ButtonProps, "onClick" | "children">) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copié dans le presse-papiers");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible d'accéder au presse-papiers. Sélectionnez le texte et copiez-le manuellement.");
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void copy()} disabled={!text} {...props} data-testid="copy-button">
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copié" : label}
    </Button>
  );
}
