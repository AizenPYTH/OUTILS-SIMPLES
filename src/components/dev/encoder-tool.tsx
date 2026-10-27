"use client";

import * as React from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { TextInputPanel, TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { Segmented } from "@/components/pdf/shared/segmented";
import {
  bytesToBase64,
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  escapeHtml,
  unescapeHtml,
} from "@/lib/dev/encoding";
import { formatBytes } from "@/lib/files/format";
import { tr } from "@/lib/i18n/messages";

export type EncoderKind = "base64" | "url" | "html";
type Direction = "encode" | "decode";

const LABELS: Record<
  EncoderKind,
  { encode: string; decode: string; inputEncode: string; inputDecode: string; file: string }
> = {
  base64: {
    encode: tr("Encoder en Base64"),
    decode: tr("Décoder du Base64"),
    inputEncode: tr("Texte à encoder"),
    inputDecode: tr("Base64 à décoder"),
    file: "texte-base64.txt",
  },
  url: {
    encode: tr("Encoder pour une URL"),
    decode: tr("Décoder une URL"),
    inputEncode: tr("Texte ou URL à encoder"),
    inputDecode: tr("Texte encodé (%20, %C3%A9…)"),
    file: "texte-url.txt",
  },
  html: {
    encode: tr("Échapper (texte → HTML)"),
    decode: tr("Déséchapper (HTML → texte)"),
    inputEncode: tr("Texte contenant <, >, &, guillemets…"),
    inputDecode: tr("HTML avec entités (&amp;, &eacute;, &#233;…)"),
    file: "texte-html.txt",
  },
};

const FILE_MAX = 5 * 1024 * 1024;

export function Base64Tool() {
  return <EncoderTool kind="base64" />;
}
export function UrlEncodeTool() {
  return <EncoderTool kind="url" />;
}
export function HtmlEntitiesTool() {
  return <EncoderTool kind="html" />;
}

export function EncoderTool({ kind }: { kind: EncoderKind }) {
  const [direction, setDirection] = React.useState<Direction>("encode");
  const [input, setInput] = React.useState("");
  const [urlSafe, setUrlSafe] = React.useState(false);
  const [wrap, setWrap] = React.useState(false);
  const [fullUrl, setFullUrl] = React.useState(false);
  const [fileResult, setFileResult] = React.useState<{
    name: string;
    size: number;
    dataUri: string;
  } | null>(null);

  const result = React.useMemo<{ output: string; error: string | null }>(() => {
    if (!input) return { output: "", error: null };
    try {
      if (kind === "base64") {
        if (direction === "encode") {
          const encoded = encodeBase64(input, urlSafe);
          return { output: wrap ? encoded.replace(/(.{76})/g, "$1\n") : encoded, error: null };
        }
        return { output: decodeBase64(input.replace(/\s+/g, "")), error: null };
      }
      if (kind === "url") {
        if (direction === "encode")
          return { output: encodeUrl(input, fullUrl ? "full" : "component"), error: null };
        return { output: decodeUrl(input), error: null };
      }
      return {
        output: direction === "encode" ? escapeHtml(input) : unescapeHtml(input),
        error: null,
      };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : tr("Décodage impossible : entrée invalide."),
      };
    }
  }, [input, kind, direction, urlSafe, wrap, fullUrl]);

  const onFile = async (file: File) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = file.type || "application/octet-stream";
      setFileResult({
        name: file.name,
        size: file.size,
        dataUri: `data:${mime};base64,${bytesToBase64(bytes)}`,
      });
    } catch {
      toast.error(tr("Lecture du fichier impossible."));
    }
  };

  const labels = LABELS[kind];

  return (
    <div className="space-y-4">
      <Segmented
        label={tr("Sens de conversion")}
        value={direction}
        onChange={setDirection}
        className="sm:grid-cols-2"
        options={[
          { value: "encode", label: labels.encode },
          { value: "decode", label: labels.decode },
        ]}
      />
      <TextInputPanel
        id={`${kind}-input`}
        label={direction === "encode" ? labels.inputEncode : labels.inputDecode}
        value={input}
        onChange={setInput}
        rows={7}
      />
      {kind === "base64" || kind === "url" ? (
        <ToolPanel className="flex flex-wrap items-center gap-6">
          {kind === "base64" ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={urlSafe} onCheckedChange={(v) => setUrlSafe(v === true)} />{" "}
                {tr("Variante URL-safe (- et _ au lieu de + et /)")}
              </label>
              {direction === "encode" ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={wrap} onCheckedChange={(v) => setWrap(v === true)} />{" "}
                  {tr("Couper en lignes de 76 caractères (MIME)")}
                </label>
              ) : null}
            </>
          ) : direction === "encode" ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={fullUrl} onCheckedChange={(v) => setFullUrl(v === true)} />{" "}
              {tr("URL complète (conserver : / ? & = #)")}
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tr(
                "Les « + » sont convertis en espaces (formulaires) et les séquences %XX décodées en UTF-8.",
              )}
            </p>
          )}
        </ToolPanel>
      ) : null}
      {result.error ? (
        <Alert variant="destructive" data-testid={`${kind}-error`}>
          {tr(result.error)}
        </Alert>
      ) : null}
      <TextOutputPanel
        id={`${kind}-output`}
        label={tr("Résultat")}
        value={result.output}
        filename={labels.file}
        rows={7}
        toolId={`dev-${kind === "html" ? "html-entities" : kind === "url" ? "url-encode" : "base64"}`}
      />
      {kind === "base64" ? (
        <ToolPanel className="space-y-3">
          <p className="text-sm font-medium">{tr("Fichier vers Data URI (image, police, PDF…)")}</p>
          <FileDropzone
            onFiles={(f) => f[0] && void onFile(f[0])}
            accept="*/*"
            compact
            validate={(f) =>
              f.size > FILE_MAX
                ? tr("fichier trop volumineux (max {max})", { max: formatBytes(FILE_MAX) })
                : null
            }
            title={tr("Déposez un fichier à encoder en Base64")}
            hint={tr("Jusqu'à {max} · résultat sous forme de data: URI", {
              max: formatBytes(FILE_MAX),
            })}
            buttonLabel={tr("Choisir un fichier")}
            testId="base64-file"
          />
          {fileResult ? (
            <TextOutputPanel
              id="base64-file-output"
              label={`${fileResult.name} (${formatBytes(fileResult.size)} → ${formatBytes(fileResult.dataUri.length)})`}
              value={fileResult.dataUri}
              filename={`${fileResult.name}.base64.txt`}
              rows={5}
              toolId="dev-base64"
            />
          ) : null}
        </ToolPanel>
      ) : null}
    </div>
  );
}
