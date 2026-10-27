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

export async function ogImage({ title, subtitle, kicker, accent = "#5146e5", footer }: OgInput) {
  const size = title.length > 48 ? 54 : title.length > 32 ? 64 : 76;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(135deg, #f8f9fc 0%, #eef0fa 100%)",
        color: "#14172b",
        fontFamily: "Liberation",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 11, border: "5px solid white" }} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>{siteConfig.name}</div>
        <div style={{ marginLeft: "auto", fontSize: 24, color: "#5b6078" }}>
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
          <div style={{ fontSize: 30, color: "#3f4460", lineHeight: 1.3, maxWidth: 1020 }}>
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
