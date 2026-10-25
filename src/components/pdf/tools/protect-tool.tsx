"use client";

import * as React from "react";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/pdf/shared/segmented";
import { PdfDropzone } from "@/components/pdf/shared/pdf-dropzone";
import { FileSummary } from "@/components/pdf/shared/file-summary";
import { BusyPanel, DonePanel, ErrorPanel } from "@/components/pdf/shared/processing-panel";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { pdfLimits } from "@/config/limits";
import { readPdfFile } from "@/lib/pdf/browser/read-file";
import { isPdfError, toPdfError, type PdfError } from "@/lib/pdf/errors";
import { checkPdf, getBrowserQpdf, isEncryptedPdf, protectPdf, unlockPdf, type EncryptionLevel, type PdfCheckReport } from "@/lib/pdf/qpdf";
import { formatBytes } from "@/lib/files/format";
import { track } from "@/lib/analytics/events";
import { t } from "@/lib/i18n";

/** Loads raw bytes without pdf-lib (encrypted files cannot be parsed by it). */
function useRawPdf(toolId: string) {
  const [file, setFile] = React.useState<{ file: File; bytes: Uint8Array } | null>(null);
  const [error, setError] = React.useState<PdfError | null>(null);
  const load = async (f: File) => {
    try {
      const bytes = await readPdfFile(f, pdfLimits.maxFileSizeBytes);
      setFile({ file: f, bytes });
      setError(null);
      track("tool_start", { tool: toolId });
    } catch (e) {
      setError(isPdfError(e) ? e : toPdfError(e));
    }
  };
  const reset = () => {
    setFile(null);
    setError(null);
  };
  return { file, error, load, reset };
}

export function ProtectTool() {
  const raw = useRawPdf("pdf-protect");
  const [userPassword, setUserPassword] = React.useState("");
  const [ownerPassword, setOwnerPassword] = React.useState("");
  const [level, setLevel] = React.useState<EncryptionLevel>("aes-256");
  const [perms, setPerms] = React.useState({ allowPrinting: true, allowCopy: false, allowModification: false, allowAnnotations: false });
  const op = useOperation<Uint8Array>("pdf-protect");

  if (raw.error) return <ErrorPanel error={raw.error} onReset={raw.reset} />;
  if (!raw.file) return <PdfDropzone onFiles={(f) => f[0] && void raw.load(f[0])} maxFileSizeBytes={pdfLimits.maxFileSizeBytes} />;
  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={raw.reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return <DonePanel summary={`Chiffré ${level === "aes-256" ? "AES-256" : "AES-128"} · ${formatBytes(bytes.byteLength)}`} onDownload={() => downloadPdf(bytes, raw.file!.file.name, "protege", "pdf-protect")} onStartOver={() => (op.reset(), raw.reset())} />;
  }
  const alreadyEncrypted = isEncryptedPdf(raw.file.bytes);
  const tooShort = userPassword.length > 0 && userPassword.length < 4;

  return (
    <div className="space-y-5">
      <FileSummary name={raw.file.file.name} size={raw.file.file.size} onReset={raw.reset} />
      {alreadyEncrypted ? <Alert variant="warning">Ce PDF est déjà chiffré. Déverrouillez-le d&apos;abord avec l&apos;outil « Déverrouiller un PDF » si vous souhaitez changer son mot de passe.</Alert> : null}
      <ToolPanel className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pw-user">Mot de passe d&apos;ouverture</Label>
            <Input id="pw-user" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} autoComplete="new-password" data-testid="pw-user" />
            <p className="text-xs text-muted-foreground">Demandé pour ouvrir le document. {tooShort ? <span className="text-destructive">4 caractères minimum.</span> : null}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-owner">Mot de passe propriétaire ({t.common.optional})</Label>
            <Input id="pw-owner" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">Permet de lever les restrictions ci-dessous. Identique au mot de passe d&apos;ouverture si vide.</p>
          </div>
        </div>
        <Segmented label="Chiffrement" value={level} onChange={setLevel} className="sm:grid-cols-2" options={[{ value: "aes-256", label: "AES-256", description: "Recommandé (PDF 1.7+)" }, { value: "aes-128", label: "AES-128", description: "Compatibilité anciens lecteurs" }]} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Autorisations (sans le mot de passe propriétaire)</legend>
          {(
            [
              ["allowPrinting", "Autoriser l'impression"],
              ["allowCopy", "Autoriser la copie du texte et des images"],
              ["allowModification", "Autoriser la modification"],
              ["allowAnnotations", "Autoriser les annotations et le remplissage de formulaires"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox id={`perm-${key}`} checked={perms[key]} onCheckedChange={(c) => setPerms((p) => ({ ...p, [key]: c === true }))} />
              <Label htmlFor={`perm-${key}`} className="font-normal">
                {label}
              </Label>
            </div>
          ))}
        </fieldset>
        <Alert variant="info">Les restrictions (impression, copie…) sont respectées par les lecteurs PDF mais ne sont pas une protection absolue : seul le mot de passe d&apos;ouverture empêche réellement la lecture. Conservez-le précieusement, il n&apos;est pas récupérable.</Alert>
      </ToolPanel>
      <Button type="button" size="lg" className="w-full" disabled={alreadyEncrypted || tooShort || (!userPassword && !ownerPassword)} onClick={() => void op.run(async () => protectPdf(await getBrowserQpdf(), raw.file!.bytes, { userPassword, ownerPassword, level, ...perms }))} data-testid="protect-run">
        <Lock aria-hidden="true" /> Protéger le PDF
      </Button>
    </div>
  );
}

export function UnlockTool() {
  const raw = useRawPdf("pdf-unlock");
  const [password, setPassword] = React.useState("");
  const [authorized, setAuthorized] = React.useState(false);
  const op = useOperation<Uint8Array>("pdf-unlock");

  if (raw.error) return <ErrorPanel error={raw.error} onReset={raw.reset} />;
  if (!raw.file) return <PdfDropzone onFiles={(f) => f[0] && void raw.load(f[0])} maxFileSizeBytes={pdfLimits.maxFileSizeBytes} />;
  if (op.state.status === "busy") return <BusyPanel progress={op.state.progress} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={raw.reset} />;
  if (op.state.status === "done") {
    const bytes = op.state.result;
    return <DonePanel summary={`Protection retirée · ${formatBytes(bytes.byteLength)}`} onDownload={() => downloadPdf(bytes, raw.file!.file.name, "deverrouille", "pdf-unlock")} onStartOver={() => (op.reset(), raw.reset())} />;
  }
  const encrypted = isEncryptedPdf(raw.file.bytes);

  return (
    <div className="space-y-5">
      <FileSummary name={raw.file.file.name} size={raw.file.file.size} onReset={raw.reset} />
      {!encrypted ? <Alert variant="info">Ce PDF ne semble pas chiffré : il s&apos;ouvre sans mot de passe. L&apos;outil peut tout de même retirer d&apos;éventuelles restrictions si vous disposez du mot de passe propriétaire.</Alert> : null}
      <ToolPanel className="space-y-4">
        <div className="space-y-1 sm:max-w-sm">
          <Label htmlFor="unlock-pw">Mot de passe du document</Label>
          <Input id="unlock-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" data-testid="unlock-pw" />
          <p className="text-xs text-muted-foreground">Mot de passe d&apos;ouverture ou propriétaire. Il n&apos;est utilisé que dans votre navigateur et n&apos;est jamais transmis.</p>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="unlock-auth" checked={authorized} onCheckedChange={(c) => setAuthorized(c === true)} className="mt-0.5" data-testid="unlock-auth" />
          <Label htmlFor="unlock-auth" className="font-normal leading-relaxed">
            Je suis l&apos;auteur de ce document ou autorisé à en retirer la protection. Cet outil ne permet pas de retrouver un mot de passe oublié ni de contourner une protection sans y être autorisé.
          </Label>
        </div>
      </ToolPanel>
      <Button type="button" size="lg" className="w-full" disabled={!authorized} onClick={() => void op.run(async () => unlockPdf(await getBrowserQpdf(), raw.file!.bytes, password))} data-testid="unlock-run">
        <LockOpen aria-hidden="true" /> Déverrouiller
      </Button>
    </div>
  );
}

export function CheckPdfTool() {
  const raw = useRawPdf("pdf-check");
  const op = useOperation<PdfCheckReport>("pdf-check");
  React.useEffect(() => {
    if (raw.file && op.state.status === "idle") void op.run(async () => checkPdf(await getBrowserQpdf(), raw.file!.bytes));
  }, [raw.file, op]);

  if (raw.error) return <ErrorPanel error={raw.error} onReset={raw.reset} />;
  if (!raw.file) return <PdfDropzone onFiles={(f) => f[0] && void raw.load(f[0])} maxFileSizeBytes={pdfLimits.maxFileSizeBytes} />;
  if (op.state.status === "busy" || op.state.status === "idle") return <BusyPanel progress={{ current: 0, total: 0, label: "Analyse de la structure…" }} />;
  if (op.state.status === "error") return <ErrorPanel error={op.state.error} onRetry={op.reset} onReset={raw.reset} />;
  const report = op.state.result;
  return (
    <div className="space-y-5" data-testid="check-report">
      <FileSummary name={raw.file.file.name} size={raw.file.file.size} onReset={() => (op.reset(), raw.reset())} />
      <ToolPanel className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`size-5 ${report.ok ? "text-success" : "text-warning-foreground"}`} aria-hidden="true" />
          <h3 className="text-base font-semibold">{report.ok ? "Aucune erreur de structure détectée" : report.encrypted ? "Document chiffré" : "Problèmes détectés"}</h3>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Version PDF</dt>
            <dd className="font-medium">{report.version}</dd>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Chiffrement</dt>
            <dd className="font-medium">{report.encrypted ? "Oui" : "Non"}</dd>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Linéarisé (web)</dt>
            <dd className="font-medium">{report.linearized ? "Oui" : "Non"}</dd>
          </div>
        </dl>
        {report.warnings.length || report.errors.length ? (
          <ul className="max-h-60 space-y-1 overflow-auto font-mono text-xs">
            {[...report.errors, ...report.warnings].map((line, i) => (
              <li key={i} className="rounded bg-warning-soft px-2 py-1 text-warning-foreground">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {report.repaired ? (
          <div className="space-y-2">
            <Alert variant="success" title="Une copie réécrite est disponible">qpdf a pu relire le document et en réécrire une version propre. Vérifiez-la : la réparation corrige les tables de références et les objets mal formés, pas un contenu manquant.</Alert>
            <Button type="button" onClick={() => downloadPdf(report.repaired!, raw.file!.file.name, "repare", "pdf-check")}>
              Télécharger la copie réparée
            </Button>
          </div>
        ) : !report.ok && !report.encrypted ? (
          <Alert variant="warning">Le fichier n&apos;a pas pu être réécrit : la structure est trop endommagée pour une réparation automatique. Essayez de récupérer l&apos;original auprès de l&apos;expéditeur.</Alert>
        ) : null}
        <p className="text-xs text-muted-foreground">Vérification réalisée par qpdf (WebAssembly) dans votre navigateur. Elle détecte les erreurs de syntaxe et d&apos;encodage des flux ; elle ne garantit pas l&apos;absence d&apos;autres défauts.</p>
      </ToolPanel>
    </div>
  );
}
