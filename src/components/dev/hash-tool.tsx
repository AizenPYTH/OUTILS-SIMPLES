"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { TextInputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { hashHex } from "@/lib/dev/random";
import { formatBytes } from "@/lib/files/format";
import { tr } from "@/lib/i18n/messages";
import { track } from "@/lib/analytics/events";

const TOOL_ID = "dev-hash";
const ALGORITHMS = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"] as const;
type Algorithm = (typeof ALGORITHMS)[number];
const FILE_MAX = 500 * 1024 * 1024;

type Hashes = Partial<Record<Algorithm, string>>;

async function hashAll(input: string | Uint8Array): Promise<Hashes> {
  const out: Hashes = {};
  for (const algorithm of ALGORITHMS) out[algorithm] = await hashHex(algorithm, input);
  return out;
}

export function HashTool() {
  const [text, setText] = React.useState("");
  const [textHashes, setTextHashes] = React.useState<Hashes>({});
  const [file, setFile] = React.useState<{ name: string; size: number; hashes: Hashes } | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);
  const [expected, setExpected] = React.useState("");
  const [uppercase, setUppercase] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    hashAll(text).then((h) => !cancelled && setTextHashes(h));
    return () => {
      cancelled = true;
    };
  }, [text]);

  const onFile = async (f: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      setFile({ name: f.name, size: f.size, hashes: await hashAll(bytes) });
      track("tool_success", { tool: TOOL_ID, option: "file" });
    } finally {
      setBusy(false);
    }
  };

  const normalizedExpected = expected.trim().toLowerCase();
  const render = (hashes: Hashes, idPrefix: string) => (
    <ToolPanel className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{tr("Empreintes")}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="accent-primary"
          />{" "}
          {tr("majuscules")}
        </label>
      </div>
      <dl className="space-y-2">
        {ALGORITHMS.map((algorithm) => {
          const value = hashes[algorithm] ?? "";
          const shown = uppercase ? value.toUpperCase() : value;
          const match = normalizedExpected && value ? value === normalizedExpected : null;
          return (
            <div key={algorithm} className="rounded-md bg-muted/50 px-3 py-2">
              <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {algorithm}
                {match === true ? (
                  <span className="inline-flex items-center gap-1 text-success-foreground">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" /> {tr("correspond")}
                  </span>
                ) : null}
                {match === false && normalizedExpected.length === value.length ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <XCircle className="size-3.5" aria-hidden="true" /> {tr("différent")}
                  </span>
                ) : null}
              </dt>
              <dd className="mt-1 flex items-start gap-2">
                <code
                  className="min-w-0 flex-1 break-all font-mono text-[12px]"
                  data-testid={`${idPrefix}-${algorithm.toLowerCase()}`}
                >
                  {shown}
                </code>
                <CopyButton text={shown} label={tr("Copier")} />
              </dd>
            </div>
          );
        })}
      </dl>
    </ToolPanel>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">{tr("Texte")}</TabsTrigger>
          <TabsTrigger value="file">{tr("Fichier")}</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="space-y-4">
          <TextInputPanel
            id="hash-input"
            label={tr("Texte (UTF-8)")}
            value={text}
            onChange={setText}
            rows={5}
            placeholder={tr("Le texte dont vous voulez l'empreinte")}
          />
          {render(textHashes, "hash-text")}
        </TabsContent>
        <TabsContent value="file" className="space-y-4">
          <FileDropzone
            onFiles={(f) => f[0] && void onFile(f[0])}
            accept="*/*"
            validate={(f) =>
              f.size > FILE_MAX
                ? tr("fichier trop volumineux (max {max})", { max: formatBytes(FILE_MAX) })
                : null
            }
            title={tr("Déposez un fichier pour calculer son empreinte")}
            hint={tr("Tout type de fichier · {max} max · lu localement", {
              max: formatBytes(FILE_MAX),
            })}
            buttonLabel={tr("Choisir un fichier")}
            compact={!!file}
            disabled={busy}
            testId="hash-file"
          />
          {busy ? <p className="text-sm text-muted-foreground">{tr("Calcul en cours…")}</p> : null}
          {file ? (
            <>
              <p className="text-sm">
                <span className="font-medium">{file.name}</span> · {formatBytes(file.size)}
              </p>
              {render(file.hashes, "hash-file")}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
      <ToolPanel className="space-y-2">
        <Label htmlFor="hash-expected">
          {tr("Comparer avec une empreinte attendue (facultatif)")}
        </Label>
        <Input
          id="hash-expected"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder={tr("Collez le SHA-256 fourni par l'éditeur du fichier")}
          className="font-mono text-xs"
          data-testid="hash-expected"
        />
        <Alert variant="info">
          {tr(
            "MD5 n'est pas proposé : il n'est plus considéré comme sûr et n'est pas disponible dans l'API Web Crypto des navigateurs. SHA-1 est fourni pour vérifier d'anciennes sommes de contrôle uniquement.",
          )}
        </Alert>
      </ToolPanel>
    </div>
  );
}
