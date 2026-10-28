import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/**
 * Open Graph / Twitter images (1200 × 630), generated at build for every page
 * from the registry: tool or page name, family, the local-processing promise.
 * Fonts: Liberation Sans (OFL) from public/fonts, read from disk (Node runtime).
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

interface OgInput {
  title: string;
  subtitle?: string;
  /** Small label above the title (family or section). */
  kicker?: string;
  accent?: string;
  /** Footer line (defaults to the French promise). */
  footer?: string;
}

export const OG_FOOTER_EN = "Processed in your browser · nothing is sent to a server · free";

async function fonts() {
  const dir = path.join(process.cwd(), "public", "fonts");
  const [bold, regular] = await Promise.all([
    readFile(path.join(dir, "LiberationSans-Bold.ttf")),
    readFile(path.join(dir, "LiberationSans-Regular.ttf")),
  ]);
  return [
    { name: "Liberation", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Liberation", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}

/** The logo mark (src/assets/brand), inlined as a data URL. */
async function markDataUrl() {
  const file = path.join(process.cwd(), "src", "assets", "brand", "averopdf-mark-og.png");
  return `data:image/png;base64,${(await readFile(file)).toString("base64")}`;
}

export async function ogImage({ title, subtitle, kicker, accent = "#0e6b3c", footer }: OgInput) {
  const size = title.length > 48 ? 54 : title.length > 32 ? 64 : 76;
  const mark = await markDataUrl();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(135deg, #ffffff 0%, #eaf7e1 100%)",
        color: "#10241a",
        fontFamily: "Liberation",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
        <img src={mark} width={82} height={64} alt="" />
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: 1 }}>
          <span style={{ color: "#0e6b3c" }}>AVERO</span>
          <span style={{ color: "#4dbf2a" }}>PDF</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 24, color: "#53665a" }}>
          {siteConfig.tagline}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {kicker ? (
          <div style={{ fontSize: 26, fontWeight: 700, color: accent, letterSpacing: 1 }}>
            {kicker.toUpperCase()}
          </div>
        ) : null}
        <div style={{ fontSize: size, fontWeight: 700, lineHeight: 1.08, maxWidth: 1040 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 30, color: "#3a4d41", lineHeight: 1.3, maxWidth: 1020 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#1d7a4f" }}
      >
        <div style={{ width: 16, height: 16, borderRadius: 8, background: "#1d7a4f" }} />
        {footer ?? "Traitement dans votre navigateur · rien n'est envoyé sur un serveur · gratuit"}
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}
