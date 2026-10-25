"use client";

/** Placeholder replaced in phase 3 by the real registry-to-component map. */
export function ToolRenderer({ toolId }: { toolId: string }) {
  return <div data-tool-id={toolId} className="rounded-[24px] border border-dashed border-border p-16 text-center text-sm text-muted-foreground">Outil en cours de chargement…</div>;
}
