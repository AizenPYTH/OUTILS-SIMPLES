"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToolPanel } from "@/components/tools/shared/tool-panel";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { triggerDownload } from "@/lib/files/download";
import { track } from "@/lib/analytics/events";
import { buildQrPayload, type QrKind, type WifiPayload, type VCardPayload } from "@/lib/codes/qr";

const TOOL_ID = "qr-generate";

export function QrGeneratorTool() {
  const [kind, setKind] = React.useState<QrKind>("url");
  const [url, setUrl] = React.useState("https://");
  const [text, setText] = React.useState("");
  const [wifi, setWifi] = React.useState<WifiPayload>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [card, setCard] = React.useState<VCardPayload>({ firstName: "", lastName: "", phone: "", email: "", organization: "", url: "" });
  const [size, setSize] = React.useState(512);
  const [margin, setMargin] = React.useState(2);
  const [dark, setDark] = React.useState("#15172b");
  const [light, setLight] = React.useState("#ffffff");
  const [level, setLevel] = React.useState<"L" | "M" | "Q" | "H">("M");
  const [svg, setSvg] = React.useState("");
  const [pngUrl, setPngUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const payload = React.useMemo(() => buildQrPayload(kind, { url, text, wifi, card }), [kind, url, text, wifi, card]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!payload.value || !canvas) {
      setSvg("");
      setPngUrl(null);
      return;
    }
    let cancelled = false;
    const options = { errorCorrectionLevel: level, margin, color: { dark, light } };
    (async () => {
      try {
        await QRCode.toCanvas(canvas, payload.value, { ...options, width: Math.min(size, 1024) });
        const svgText = await QRCode.toString(payload.value, { ...options, type: "svg", width: size });
        if (cancelled) return;
        setSvg(svgText);
        setPngUrl(canvas.toDataURL("image/png"));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Impossible de générer ce QR code (contenu trop long ?).");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload.value, size, margin, dark, light, level]);

  const downloadPng = async () => {
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, payload.value, { errorCorrectionLevel: level, margin, color: { dark, light }, width: size });
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, `qr-code-${kind}.png`);
      track("tool_download", { tool: TOOL_ID, option: "png" });
    }, "image/png");
  };
  const downloadSvg = () => {
    triggerDownload(new Blob([svg], { type: "image/svg+xml" }), `qr-code-${kind}.svg`);
    track("tool_download", { tool: TOOL_ID, option: "svg" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as QrKind)}>
          <TabsList className="w-full">
            <TabsTrigger value="url">Lien</TabsTrigger>
            <TabsTrigger value="text">Texte</TabsTrigger>
            <TabsTrigger value="wifi">Wi-Fi</TabsTrigger>
            <TabsTrigger value="vcard">Contact</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="space-y-1">
            <Label htmlFor="qr-url">Adresse web</Label>
            <Input id="qr-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemple.fr" data-testid="qr-url" />
          </TabsContent>
          <TabsContent value="text" className="space-y-1">
            <Label htmlFor="qr-text">Texte</Label>
            <Textarea id="qr-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} />
          </TabsContent>
          <TabsContent value="wifi" className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wifi-ssid">Nom du réseau (SSID)</Label>
              <Input id="wifi-ssid" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wifi-pass">Mot de passe</Label>
              <Input id="wifi-pass" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} disabled={wifi.security === "nopass"} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wifi-sec">Sécurité</Label>
              <Select value={wifi.security} onValueChange={(v) => setWifi({ ...wifi, security: v as WifiPayload["security"] })}>
                <SelectTrigger id="wifi-sec">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WPA">WPA / WPA2 / WPA3</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="nopass">Aucune (réseau ouvert)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} className="accent-primary" /> Réseau masqué
            </label>
          </TabsContent>
          <TabsContent value="vcard" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["firstName", "Prénom"],
                ["lastName", "Nom"],
                ["phone", "Téléphone"],
                ["email", "E-mail"],
                ["organization", "Organisation"],
                ["url", "Site web"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`vc-${key}`}>{label}</Label>
                <Input id={`vc-${key}`} value={card[key]} onChange={(e) => setCard({ ...card, [key]: e.target.value })} />
              </div>
            ))}
          </TabsContent>
        </Tabs>
        {payload.error ? <p className="text-sm text-destructive">{payload.error}</p> : null}
        <ToolPanel className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="qr-size">Taille (px)</Label>
            <Input id="qr-size" type="number" min={128} max={4096} step={64} value={size} onChange={(e) => setSize(Math.max(128, Math.min(4096, Number(e.target.value) || 512)))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qr-margin">Marge (modules)</Label>
            <Input id="qr-margin" type="number" min={0} max={10} value={margin} onChange={(e) => setMargin(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qr-level">Correction d&apos;erreur</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
              <SelectTrigger id="qr-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">L (7 %) – plus petit</SelectItem>
                <SelectItem value="M">M (15 %) – standard</SelectItem>
                <SelectItem value="Q">Q (25 %)</SelectItem>
                <SelectItem value="H">H (30 %) – plus robuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="qr-dark">Couleur des modules</Label>
            <input id="qr-dark" type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="size-9 cursor-pointer rounded-md border border-input bg-background p-0.5" />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="qr-light">Couleur de fond</Label>
            <input id="qr-light" type="color" value={light} onChange={(e) => setLight(e.target.value)} className="size-9 cursor-pointer rounded-md border border-input bg-background p-0.5" />
          </div>
        </ToolPanel>
        <Alert variant="info">Gardez un bon contraste (modules sombres sur fond clair) et testez le QR code avec votre téléphone avant impression. Un contenu long produit un code plus dense, donc plus difficile à lire en petit format.</Alert>
      </div>
      <aside className="space-y-3">
        <div className="flex aspect-square items-center justify-center rounded-[16px] border border-border bg-surface p-4" data-testid="qr-preview">
          <canvas ref={canvasRef} className="max-h-full max-w-full" aria-label="Aperçu du QR code" style={{ display: payload.value && !error ? "block" : "none" }} />
          {!payload.value ? <p className="text-center text-sm text-muted-foreground">Saisissez un contenu pour générer le QR code.</p> : null}
          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" size="lg" onClick={() => void downloadPng()} disabled={!pngUrl} data-testid="qr-download-png">
            <Download aria-hidden="true" /> Télécharger en PNG
          </Button>
          <Button type="button" variant="outline" onClick={downloadSvg} disabled={!svg} data-testid="qr-download-svg">
            <Download aria-hidden="true" /> Télécharger en SVG
          </Button>
          <CopyButton text={payload.value} label="Copier le contenu encodé" className="justify-center" />
        </div>
        {payload.value ? (
          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground" data-testid="qr-payload">
            {payload.value}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
