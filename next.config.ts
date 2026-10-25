import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/config/security";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Canonical URLs, sitemap and internal links all use trailing slashes.
  trailingSlash: true,
  turbopack: {
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
    ];
  },
};

export default nextConfig;
