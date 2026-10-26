/**
 * qpdf (WASM) wrapper for operations pdf-lib cannot do: encryption, password
 * removal and structural checks. The module (~1.3 MB) is loaded on demand
 * from /public/qpdf and runs entirely in the browser.
 */
import { PdfError } from "./errors";
import { t } from "@/lib/i18n";

interface QpdfModule {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  callMain: (args: string[]) => number;
}

type CreateModule = (options: Record<string, unknown>) => Promise<QpdfModule>;

export interface QpdfRun {
  code: number;
  stdout: string;
  stderr: string;
  output: Uint8Array | null;
}

export interface QpdfRunner {
  run(args: string[], input: Uint8Array): Promise<QpdfRun>;
}

/** Builds a runner from the factory (browser or Node) and a wasm location. */
export function createQpdfRunner(createModule: CreateModule, wasmUrl: string): QpdfRunner {
  return {
    async run(args, input) {
      let stdout = "";
      let stderr = "";
      // A fresh module per run keeps memory bounded and avoids FS state leaks.
      const qpdfModule = await createModule({
        locateFile: () => wasmUrl,
        noInitialRun: true,
        print: (text: string) => (stdout += `${text}\n`),
        printErr: (text: string) => (stderr += `${text}\n`),
      });
      qpdfModule.FS.writeFile("/in.pdf", input);
      let code = 0;
      // The Emscripten glue ignores `print`/`printErr` and writes to console.log /
      // console.error (browser) or directly to the process fds (Node). Hooking the
      // console while callMain runs (synchronously) captures qpdf's messages in the browser.
      const originalLog = console.log;
      const originalError = console.error;
      console.log = (...parts: unknown[]) => (stdout += `${parts.join(" ")}\n`);
      console.error = (...parts: unknown[]) => (stderr += `${parts.join(" ")}\n`);
      try {
        code = qpdfModule.callMain([
          ...args.map((a) => a.replace("{in}", "/in.pdf").replace("{out}", "/out.pdf")),
        ]);
      } catch (error) {
        code = typeof error === "number" ? error : -1;
        stderr += String(error);
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
      let output: Uint8Array | null = null;
      try {
        output = qpdfModule.FS.readFile("/out.pdf");
      } catch {
        output = null;
      }
      return { code, stdout, stderr, output };
    },
  };
}

let browserRunner: Promise<QpdfRunner> | null = null;

export function getBrowserQpdf(): Promise<QpdfRunner> {
  if (!browserRunner) {
    browserRunner = import("@neslinesli93/qpdf-wasm").then((m) =>
      createQpdfRunner(m.default as unknown as CreateModule, "/qpdf/qpdf.wasm"),
    );
  }
  return browserRunner;
}

export type EncryptionLevel = "aes-256" | "aes-128";

export interface ProtectOptions {
  userPassword: string;
  /** Defaults to the user password when empty. */
  ownerPassword: string;
  level: EncryptionLevel;
  allowPrinting: boolean;
  allowModification: boolean;
  allowCopy: boolean;
  allowAnnotations: boolean;
}

export function buildEncryptArgs(options: ProtectOptions): string[] {
  const owner = options.ownerPassword || options.userPassword;
  const bits = options.level === "aes-256" ? "256" : "128";
  // 128-bit keys default to RC4, which qpdf ≥ 11 refuses without --allow-weak-crypto: force AES.
  const aes = options.level === "aes-256" ? [] : ["--use-aes=y"];
  const perms = [
    `--print=${options.allowPrinting ? "full" : "none"}`,
    `--modify=${options.allowModification ? "all" : "none"}`,
    `--extract=${options.allowCopy ? "y" : "n"}`,
    `--annotate=${options.allowAnnotations ? "y" : "n"}`,
  ];
  // qpdf ≥ 11 syntax: --encrypt user owner bits [perms] --
  return ["--encrypt", options.userPassword, owner, bits, ...aes, ...perms, "--", "{in}", "{out}"];
}

export async function protectPdf(
  runner: QpdfRunner,
  bytes: Uint8Array,
  options: ProtectOptions,
): Promise<Uint8Array> {
  if (!options.userPassword && !options.ownerPassword) {
    throw new PdfError("NO_SELECTION", "Saisissez au moins un mot de passe.", {
      recoverable: true,
    });
  }
  const run = await runner.run(buildEncryptArgs(options), bytes);
  if (run.code !== 0 || !run.output)
    throw new PdfError("PROCESSING_FAILED", explainQpdf(run.stderr), { recoverable: true });
  return run.output;
}

export async function unlockPdf(
  runner: QpdfRunner,
  bytes: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  const run = await runner.run([`--password=${password}`, "--decrypt", "{in}", "{out}"], bytes);
  if (run.code !== 0 || !run.output) {
    // qpdf writes "invalid password" to stderr; in environments where stderr
    // is not captured, an encrypted input that fails to decrypt means the same.
    if (/invalid password/i.test(run.stderr) || isEncryptedPdf(bytes)) {
      throw new PdfError(
        "ENCRYPTED",
        "Mot de passe incorrect : le document n'a pas pu être déverrouillé.",
        { recoverable: true },
      );
    }
    throw new PdfError("PROCESSING_FAILED", explainQpdf(run.stderr), { recoverable: true });
  }
  return run.output;
}

/** qpdf exits 3 with --requires-password when the supplied password opens the file. */
export async function passwordOpensFile(
  runner: QpdfRunner,
  bytes: Uint8Array,
  password: string,
): Promise<boolean> {
  const probe = await runner.run([`--password=${password}`, "--requires-password", "{in}"], bytes);
  return probe.code === 3;
}

export interface PdfCheckReport {
  ok: boolean;
  encrypted: boolean;
  linearized: boolean;
  version: string;
  warnings: string[];
  errors: string[];
  /** Repaired copy when qpdf could rewrite the file despite warnings. */
  repaired: Uint8Array | null;
}

/** Structural check; when warnings are found qpdf attempts a rewrite ("réparation simple"). */
export async function checkPdf(runner: QpdfRunner, bytes: Uint8Array): Promise<PdfCheckReport> {
  const run = await runner.run(["--check", "{in}"], bytes);
  const lines = `${run.stdout}\n${run.stderr}`
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const headerText = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  const version =
    /%PDF-(\d\.\d)/.exec(headerText)?.[1] ??
    lines
      .find((l) => l.startsWith("PDF Version:"))
      ?.replace("PDF Version:", "")
      .trim() ??
    "?";
  // Messages may be unavailable (Node, or a glue that bypasses the console): fall back to byte heuristics.
  const encrypted = lines.some((l) => /^File is encrypted/i.test(l)) || isEncryptedPdf(bytes);
  const linearized =
    lines.some((l) => /^File is linearized/i.test(l)) || /\/Linearized\b/.test(headerText);
  const warnings = lines.filter((l) => /WARNING/i.test(l));
  const errors = lines.filter(
    (l) => !/WARNING/i.test(l) && /error|can't find|unable|invalid|damaged|not a pdf/i.test(l),
  );
  if (run.code !== 0 && errors.length === 0 && warnings.length === 0) {
    errors.push(
      encrypted
        ? "Le document est chiffré : déverrouillez-le pour une analyse complète."
        : "qpdf n'a pas pu lire ce fichier (structure endommagée ou fichier incomplet).",
    );
  }
  let repaired: Uint8Array | null = null;
  if (run.code !== 0 && !encrypted) {
    const rewrite = await runner.run(["--warning-exit-0", "{in}", "{out}"], bytes);
    if (rewrite.output && rewrite.output.length > 0) repaired = rewrite.output;
  }
  return { ok: run.code === 0, encrypted, linearized, version, warnings, errors, repaired };
}

function explainQpdf(stderr: string): string {
  const line =
    stderr
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.replace(/^[^:]*:\s*\/in\.pdf:\s*/, "") ?? "";
  if (/not a pdf|startxref|xref/i.test(line)) return t.errors.corrupted;
  return line ? `qpdf : ${line}` : t.errors.processingFailed;
}

export function isEncryptedPdf(bytes: Uint8Array): boolean {
  // Cheap heuristic on the trailer region: /Encrypt entry present.
  const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.length - 4096)));
  return (
    /\/Encrypt\b/.test(tail) ||
    /\/Encrypt\b/.test(
      new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 65536))),
    )
  );
}
