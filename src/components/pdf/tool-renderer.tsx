"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const loading = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Chargement de l'outil">
    <Skeleton className="h-64 w-full rounded-[24px]" />
  </div>
);

/**
 * Maps registry ids to lazily loaded client components. Each tool bundle
 * (pdf-lib, pdf.js, dnd-kit…) is only downloaded on its own page.
 */
const components = {
  "pdf-merge": dynamic(() => import("./tools/merge-tool").then((m) => m.MergeTool), { ssr: false, loading }),
  "pdf-split": dynamic(() => import("./tools/split-tool").then((m) => m.SplitTool), { ssr: false, loading }),
  "pdf-extract-pages": dynamic(() => import("./tools/extract-pages-tool").then((m) => m.ExtractPagesTool), { ssr: false, loading }),
  "pdf-organize": dynamic(() => import("./tools/organize-tool").then((m) => m.OrganizeTool), { ssr: false, loading }),
  "pdf-rotate": dynamic(() => import("./tools/rotate-tool").then((m) => m.RotateTool), { ssr: false, loading }),
  "pdf-compress": dynamic(() => import("./tools/compress-tool").then((m) => m.CompressTool), { ssr: false, loading }),
  "pdf-watermark": dynamic(() => import("./tools/watermark-tool").then((m) => m.WatermarkTool), { ssr: false, loading }),
  "pdf-manage-watermark": dynamic(() => import("./tools/manage-watermark-tool").then((m) => m.ManageWatermarkTool), { ssr: false, loading }),
  "pdf-fill-form": dynamic(() => import("./tools/fill-form-tool").then((m) => m.FillFormTool), { ssr: false, loading }),
  "pdf-edit": dynamic(() => import("./tools/annotation-tool").then((m) => m.EditorTool), { ssr: false, loading }),
  "pdf-annotate": dynamic(() => import("./tools/annotation-tool").then((m) => m.AnnotateTool), { ssr: false, loading }),
  "pdf-add-text": dynamic(() => import("./tools/annotation-tool").then((m) => m.AddTextTool), { ssr: false, loading }),
  "pdf-sign": dynamic(() => import("./tools/annotation-tool").then((m) => m.SignTool), { ssr: false, loading }),
} as const;

export type ImplementedToolId = keyof typeof components;

export function isImplementedTool(id: string): id is ImplementedToolId {
  return id in components;
}

export function ToolRenderer({ toolId }: { toolId: string }) {
  if (!isImplementedTool(toolId)) {
    // A published registry entry without a component is a build-time mistake, not a runtime feature.
    throw new Error(`Tool "${toolId}" is published but has no implementation.`);
  }
  const Component = components[toolId];
  return <Component />;
}
