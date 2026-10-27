import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/config/env";

/** A preview deployment (NEXT_PUBLIC_NOINDEX=true) refuses every crawler and advertises no sitemap. */
export default function robots(): MetadataRoute.Robots {
  if (publicEnv.NEXT_PUBLIC_NOINDEX) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/_next/"] }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
