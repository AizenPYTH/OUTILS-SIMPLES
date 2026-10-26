/**
 * Security headers applied to every response.
 *
 * Design decision: the CSP is static (no per-request nonce) so that every
 * public page can be statically generated and served from a CDN. Next.js
 * requires `'unsafe-inline'` for its hydration scripts in that mode. When
 * advertising / analytics / an external CMP are activated, their hosts must be
 * added here (see docs/ARCHITECTURE.md → "Security boundaries").
 */

export interface SecurityHeaderOptions {
  isDev: boolean;
  /** Extra script origins (ads, analytics, CMP). */
  scriptSrc?: string[];
  /** Extra connect origins (analytics endpoints). */
  connectSrc?: string[];
  /** Extra frame origins (ad iframes). */
  frameSrc?: string[];
  /** Extra image origins. */
  imgSrc?: string[];
}

const ADS_SCRIPT_HOSTS = [
  "https://pagead2.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://tpc.googlesyndication.com",
  "https://fundingchoicesmessages.google.com",
  "https://www.googletagservices.com",
  "https://adservice.google.com",
];
const ADS_FRAME_HOSTS = [
  "https://googleads.g.doubleclick.net",
  "https://tpc.googlesyndication.com",
  "https://www.google.com",
  "https://fundingchoicesmessages.google.com",
];
const ADS_IMG_HOSTS = ["https://pagead2.googlesyndication.com", "https://*.googleusercontent.com"];
const ADS_CONNECT_HOSTS = [
  "https://pagead2.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://fundingchoicesmessages.google.com",
];

function unique(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function buildContentSecurityPolicy(options: SecurityHeaderOptions): string {
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  const analytics = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "none";

  // 'wasm-unsafe-eval' lets pdf.js decoders, Tesseract (OCR) and qpdf run as WebAssembly without allowing JS eval.
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    ...(options.scriptSrc ?? []),
  ];
  const connectSrc = ["'self'", ...(options.connectSrc ?? [])];
  const frameSrc = ["'none'", ...(options.frameSrc ?? [])];
  const imgSrc = ["'self'", "blob:", "data:", ...(options.imgSrc ?? [])];

  if (options.isDev) {
    // React dev tooling needs eval for source-mapped stack traces.
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:", "wss:");
  }
  if (adsEnabled) {
    scriptSrc.push(...ADS_SCRIPT_HOSTS);
    frameSrc.push(...ADS_FRAME_HOSTS);
    imgSrc.push(...ADS_IMG_HOSTS);
    connectSrc.push(...ADS_CONNECT_HOSTS);
  }
  if (analytics === "plausible") {
    const host = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || "https://plausible.io";
    scriptSrc.push(host);
    connectSrc.push(host);
  }
  if (analytics === "gtag") {
    scriptSrc.push("https://www.googletagmanager.com");
    connectSrc.push("https://www.google-analytics.com", "https://analytics.google.com");
    imgSrc.push("https://www.google-analytics.com");
  }

  const frames = frameSrc.length > 1 ? frameSrc.filter((v) => v !== "'none'") : frameSrc;

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": unique(scriptSrc),
    // Tailwind + Radix + Sonner set inline style attributes; pdf.js text layer too.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": unique(imgSrc),
    "font-src": ["'self'", "data:"],
    "connect-src": unique(connectSrc),
    // pdf.js worker is loaded from a same-origin asset; blob: covers fallback workers.
    "worker-src": ["'self'", "blob:"],
    "frame-src": unique(frames),
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };
  if (!options.isDev) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ");
}

export function buildSecurityHeaders(
  options: SecurityHeaderOptions,
): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      // The scanner and the QR reader use getUserMedia on this origin only; everything else stays off.
      value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(options.isDev
      ? []
      : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  ];
}
