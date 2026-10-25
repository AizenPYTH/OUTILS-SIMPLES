import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/config/security";
import { parsePublicEnv } from "@/config/env";
import { sanitizeProps, sizeBucket } from "@/lib/analytics/events";
import { parseConsent, defaultConsent } from "@/lib/consent/store";

describe("security headers", () => {
  it("builds a strict production CSP without eval", () => {
    const csp = buildContentSecurityPolicy({ isDev: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("upgrade-insecure-requests");
    const headers = buildSecurityHeaders({ isDev: false }).map((h) => h.key);
    expect(headers).toContain("Strict-Transport-Security");
    expect(headers).toContain("X-Content-Type-Options");
  });
  it("allows eval and websockets only in development", () => {
    const csp = buildContentSecurityPolicy({ isDev: true });
    expect(csp).toContain("unsafe-eval");
    expect(csp).toContain("ws:");
  });
});

describe("public env", () => {
  it("defaults to a safe configuration", () => {
    const env = parsePublicEnv({});
    expect(env.NEXT_PUBLIC_ADS_ENABLED).toBe(false);
    expect(env.NEXT_PUBLIC_ANALYTICS_PROVIDER).toBe("none");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });
  it("strips trailing slashes and rejects invalid values", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "https://outilia.fr/" }).NEXT_PUBLIC_SITE_URL).toBe("https://outilia.fr");
    expect(() => parsePublicEnv({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "spyware" })).toThrow();
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "not a url" })).toThrow();
  });
});

describe("analytics hygiene", () => {
  it("drops any property outside the allow-list", () => {
    const props = sanitizeProps({ tool: "pdf-merge", sizeBucket: sizeBucket(5 * 1024 * 1024), fileName: "secret.pdf" } as never);
    expect(props).toEqual({ tool: "pdf-merge", sizeBucket: "1-10mb" });
  });
});

describe("consent parsing", () => {
  it("treats malformed storage as no consent", () => {
    expect(parseConsent("{nope")).toEqual(defaultConsent);
    expect(parseConsent(JSON.stringify({ analytics: "yes" }))).toEqual({ decidedAt: undefined, analytics: false, advertising: false });
    expect(parseConsent(JSON.stringify({ decidedAt: "2026-01-01", analytics: true })).analytics).toBe(true);
  });
});
