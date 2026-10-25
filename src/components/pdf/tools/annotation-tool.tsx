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
        <SingleFileTool toolId={toolId}>{({ pdf, tool, reset }) => <AnnotationWorkspace pdf={pdf} mode={mode} toolId={toolId} title={tool.name} onClose={reset} />}</SingleFileTool>
      </div>
    );
  };
}

export const EditorTool = makeTool(
  "pdf-edit",
  "editor",
  "Les ajouts (texte, dessins, images, signature) sont superposés au document : le texte d'origine n'est pas modifié. L'éditeur s'ouvre en plein écran dès qu'un fichier est chargé.",
);
export const AnnotateTool = makeTool("pdf-annotate", "annotate", "Les annotations sont dessinées dans les pages (visibles partout, non modifiables après export).");
export const AddTextTool = makeTool("pdf-add-text", "text");
export const SignTool = makeTool(
  "pdf-sign",
  "sign",
  "Signature visuelle uniquement : elle n'équivaut pas à une signature électronique qualifiée. Rien n'est enregistré ni transmis.",
);
