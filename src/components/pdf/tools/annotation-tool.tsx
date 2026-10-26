"use client";

import { Alert } from "@/components/ui/alert";
import { SingleFileTool } from "@/components/pdf/shared/single-file-tool";
import { AnnotationWorkspace } from "@/components/pdf/workspace/annotation-workspace";
import type { WorkspaceMode } from "@/components/pdf/workspace/types";

function makeTool(toolId: string, mode: WorkspaceMode, notice?: string) {
  return function AnnotationBasedTool() {
    return (
      <div className="space-y-4">
        {notice ? <Alert variant="info">{notice}</Alert> : null}
        <SingleFileTool toolId={toolId} analyse={mode === "editor"}>
          {({ pdf, tool, reset }) => (
            <AnnotationWorkspace
              pdf={pdf}
              mode={mode}
              toolId={toolId}
              title={tool.name}
              onClose={reset}
            />
          )}
        </SingleFileTool>
      </div>
    );
  };
}

export const EditorTool = makeTool(
  "pdf-edit",
  "editor",
  "Dès qu'un fichier est chargé, OUTILIA l'analyse (texte natif, scan, mixte, protégé) et ouvre l'éditeur en plein écran : texte existant modifiable quand la police le permet, OCR intégré pour les scans, ajouts par-dessus, pages à réorganiser.",
);
export const AnnotateTool = makeTool(
  "pdf-annotate",
  "annotate",
  "Les annotations sont dessinées dans les pages (visibles partout, non modifiables après export).",
);
export const AddTextTool = makeTool("pdf-add-text", "text");
export const SignTool = makeTool(
  "pdf-sign",
  "sign",
  "Signature visuelle uniquement : elle n'équivaut pas à une signature électronique qualifiée. Rien n'est enregistré ni transmis.",
);
