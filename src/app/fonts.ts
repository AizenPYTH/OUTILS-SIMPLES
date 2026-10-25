import localFont from "next/font/local";

/**
 * Self-hosted fonts (no third-party request at runtime, RGPD-friendly).
 * Files come from the @fontsource-variable packages (OFL licence).
 */
export const fontHeading = localFont({
  src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-heading",
  weight: "200 800",
  display: "swap",
  preload: true,
});

export const fontBody = localFont({
  src: [
    { path: "./fonts/instrument-sans-latin-wght-normal.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/instrument-sans-latin-wght-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-body",
  display: "swap",
  preload: true,
});

/** Only used to render typed signatures; not preloaded. */
export const fontSignature = localFont({
  src: "./fonts/caveat-latin-wght-normal.woff2",
  variable: "--font-signature",
  weight: "400 700",
  display: "swap",
  preload: false,
});
