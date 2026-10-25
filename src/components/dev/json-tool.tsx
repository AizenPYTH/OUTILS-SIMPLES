"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextInputPanel, TextOutputPanel } from "@/components/tools/shared/text-io";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { describeJson, formatJson, minifyJson, validateJson, type JsonError } from "@/lib/dev/json";
import { csvToJson, jsonToCsv, type Delimiter } from "@/lib/dev/csv";

type Mode = "format" | "minify" | "to-csv";

export function JsonTool({ initialMode = "format" }: { initialMode?: Mode }) {
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [indent, setIndent] = React.useState<"2" | "4" | "tab">("2");
  const [sortKeys, setSortKeys] = React.useState(false);
  const [delimiter, setDelimiter] = React.useState<Delimiter>(";");

  const result = React.useMemo<{ output: string; error: JsonError | string | null; summary: string }>(() => {
    if (!input.trim()) return { output: "", error: null, summary: "" };
    const validation = validateJson(input);
    if (!validation.ok) return { output: "", error: validation.error, summary: "" };
    try {
      const summary = describeJson(validation.value);
      if (mode === "minify") return { output: minifyJson(input), error: null, summary };
      if (mode === "to-csv") return { output: jsonToCsv(validation.value, delimiter), error: null, summary };
      return { output: formatJson(input, indent === "tab" ? "tab" : Number(indent), sortKeys), error: null, summary };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : "Conversion impossible.", summary: "" };
    }
  }, [input, mode, indent, sortKeys, delimiter]);

  const errorObj = result.error && typeof result.error === "object" ? result.error : null;
  const lineText = errorObj ? (input.split("\n")[errorObj.line - 1] ?? "") : "";

  return (
    <div className="space-y-4">
      <TextInputPanel id="json-input" label="JSON" value={input} onChange={setInput} placeholder='{"exemple": [1, 2, 3]}' rows={12} acceptFile=".json,application/json,text/plain" />
      {errorObj ? (
        <Alert variant="destructive" title={`Erreur ligne ${errorObj.line}, colonne ${errorObj.column}`} data-testid="json-error">
          <p>{errorObj.message}</p>
          <pre className="mt-2 overflow-x-auto rounded bg-background/60 px-2 py-1 font-mono text-xs">
            {lineText}
            {"\n"}
            {" ".repeat(Math.max(0, errorObj.column - 1))}^
          </pre>
          <Button type="button" variant="link" size="sm" className="px-0" onClick={() => document.getElementById("json-input")?.focus()}>
            Aller à l&apos;erreur
          </Button>
        </Alert>
      ) : typeof result.error === "string" ? (
        <Alert variant="destructive">{result.error}</Alert>
      ) : result.summary ? (
        <Alert variant="success" data-testid="json-valid">JSON valide : {result.summary}.</Alert>
      ) : null}
      <ToolPanel className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="json-mode">Action</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger id="json-mode" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="format">Formater (indenter)</SelectItem>
              <SelectItem value="minify">Minifier</SelectItem>
              <SelectItem value="to-csv">Convertir en CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode === "format" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="json-indent">Indentation</Label>
              <Select value={indent} onValueChange={(v) => setIndent(v as typeof indent)}>
                <SelectTrigger id="json-indent" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 espaces</SelectItem>
                  <SelectItem value="4">4 espaces</SelectItem>
                  <SelectItem value="tab">Tabulation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox id="json-sort" checked={sortKeys} onCheckedChange={(c) => setSortKeys(c === true)} />
              <Label htmlFor="json-sort" className="font-normal">
                Trier les clés
              </Label>
            </div>
          </>
        ) : null}
        {mode === "to-csv" ? (
          <div className="space-y-1">
            <Label htmlFor="json-delim">Séparateur CSV</Label>
            <Select value={delimiter} onValueChange={(v) => setDelimiter(v as Delimiter)}>
              <SelectTrigger id="json-delim" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=";">Point-virgule (Excel FR)</SelectItem>
                <SelectItem value=",">Virgule</SelectItem>
                <SelectItem value={"\t"}>Tabulation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </ToolPanel>
      <TextOutputPanel id="json-output" label="Résultat" value={result.output} filename={mode === "to-csv" ? "donnees.csv" : mode === "minify" ? "donnees.min.json" : "donnees.json"} mimeType={mode === "to-csv" ? "text/csv;charset=utf-8" : "application/json"} toolId="dev-json" rows={12} />
    </div>
  );
}

export function CsvToJsonTool() {
  const [input, setInput] = React.useState("");
  const [header, setHeader] = React.useState(true);
  const [infer, setInfer] = React.useState(true);
  const result = React.useMemo(() => {
    if (!input.trim()) return { output: "", error: null as string | null, rows: 0 };
    try {
      const data = csvToJson(input, { header, inferTypes: infer });
      return { output: JSON.stringify(data, null, 2), error: null, rows: data.length };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : "Conversion impossible.", rows: 0 };
    }
  }, [input, header, infer]);
  return (
    <div className="space-y-4">
      <TextInputPanel id="csv-input" label="CSV (séparateur détecté automatiquement : ; , tabulation ou |)" value={input} onChange={setInput} placeholder={"nom;ville\nJeanne;Paris"} rows={10} acceptFile=".csv,.tsv,text/csv,text/plain" />
      <ToolPanel className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="csv-header" checked={header} onCheckedChange={(c) => setHeader(c === true)} />
          <Label htmlFor="csv-header" className="font-normal">
            La première ligne contient les en-têtes
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="csv-infer" checked={infer} onCheckedChange={(c) => setInfer(c === true)} />
          <Label htmlFor="csv-infer" className="font-normal">
            Convertir les nombres et booléens
          </Label>
        </div>
      </ToolPanel>
      {result.error ? <Alert variant="destructive">{result.error}</Alert> : null}
      <TextOutputPanel id="csv-output" label={result.rows ? `${result.rows} ligne(s) converties` : "JSON"} value={result.output} filename="donnees.json" mimeType="application/json" toolId="dev-csv-json" rows={12} />
    </div>
  );
}
