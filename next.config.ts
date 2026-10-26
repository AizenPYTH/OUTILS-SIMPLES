import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/config/security";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Canonical URLs, sitemap and internal links all use trailing slashes.
  trailingSlash: true,
  turbopack: {
    // qpdf-wasm's Emscripten glue references Node built-ins; serve empty modules in the browser.
    resolveAlias: {
      fs: { browser: "./src/lib/empty-module.ts" },
      path: { browser: "./src/lib/empty-module.ts" },
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({ isDev: process.env.NODE_ENV !== "production" }),
      },
      // The service worker and the offline manifest are revalidated on every check for updates.
      {
        source: "/(sw.js|offline-manifest.json)",
        headers: [{ key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
