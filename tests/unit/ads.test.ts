// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parsePublicEnv } from "@/config/env";
import { AD_PLACEMENTS, AD_PLACEMENT_SPECS, resolveAdsConfig } from "@/config/ads";

const root = path.resolve(__dirname, "../..");

function envWith(overrides: Record<string, string> = {}) {
  return parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000", ...overrides });
}

const fullyConfigured = {
  NEXT_PUBLIC_ADS_ENABLED: "true",
  NEXT_PUBLIC_ADS_PROVIDER: "adsense",
  NEXT_PUBLIC_ADSENSE_CLIENT: "ca-pub-0000000000000000", // test value, not a real account
  NEXT_PUBLIC_ADSENSE_SLOT_TOOL_AFTER_RESULT: "1",
  NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_END: "2",
};

describe("advertising configuration", () => {
  it("is fully off by default: no provider, no active placement, no preview", () => {
    const config = resolveAdsConfig(envWith(), "production");
    expect(config.enabled).toBe(false);
    expect(config.provider).toBe("none");
    expect(config.client).toBe("");
    expect(config.active.size).toBe(0);
    expect(config.preview).toBe(false);
  });

  it("activates only the placements that have their own ad unit id", () => {
    const config = resolveAdsConfig(envWith(fullyConfigured), "production");
    expect(config.enabled).toBe(true);
    expect([...config.active].sort()).toEqual(["guide-end", "tool-after-result"]);
  });

  it("stays off when the master switch, the provider or the publisher id is missing", () => {
    const noSwitch = { ...fullyConfigured, NEXT_PUBLIC_ADS_ENABLED: "false" };
    const noProvider = { ...fullyConfigured, NEXT_PUBLIC_ADS_PROVIDER: "none" };
    const noClient = { ...fullyConfigured, NEXT_PUBLIC_ADSENSE_CLIENT: " " };
    for (const env of [noSwitch, noProvider, noClient]) {
      const config = resolveAdsConfig(envWith(env), "production");
      expect(config.enabled).toBe(false);
      expect(config.active.size).toBe(0);
    }
    expect(() => envWith({ NEXT_PUBLIC_ADS_PROVIDER: "other" })).toThrow();
  });

  it("never previews in a production build, even when asked", () => {
    expect(
      resolveAdsConfig(envWith({ NEXT_PUBLIC_ADS_PREVIEW: "true" }), "production").preview,
    ).toBe(false);
    expect(
      resolveAdsConfig(envWith({ NEXT_PUBLIC_ADS_PREVIEW: "true" }), "development").preview,
    ).toBe(true);
    // Preview does not activate anything.
    expect(
      resolveAdsConfig(envWith({ NEXT_PUBLIC_ADS_PREVIEW: "true" }), "development").active.size,
    ).toBe(0);
  });

  it("documents every placement with a reserved size and an env variable", () => {
    for (const id of AD_PLACEMENTS) {
      const spec = AD_PLACEMENT_SPECS[id];
      expect(spec.width).toBeGreaterThan(0);
      expect(spec.height).toBeGreaterThan(0);
      expect(spec.env.startsWith("NEXT_PUBLIC_ADSENSE_SLOT_")).toBe(true);
      expect(spec.pages.length).toBeGreaterThan(10);
    }
  });
});

describe("no fake advertising identifiers in the repository", () => {
  const files = [
    ".env.example",
    "src/config/env.ts",
    "src/config/ads.ts",
    "src/components/monetization/ad-slot.tsx",
    "docs/MONETISATION_PUBLICITAIRE.md",
    "README.md",
  ];
  it("ships no publisher id, ad unit id or AdSense script outside the ad component", () => {
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      // A real publisher id is ca-pub- followed by 16 digits; placeholders use "<" or "…".
      expect(text, file).not.toMatch(/ca-pub-\d{16}/);
      expect(text, file).not.toMatch(/data-ad-slot="\d+"/);
    }
    const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
    expect(envExample).toMatch(/^NEXT_PUBLIC_ADS_ENABLED=false$/m);
    expect(envExample).toMatch(/^NEXT_PUBLIC_ADS_PROVIDER=none$/m);
    expect(envExample).toMatch(/^NEXT_PUBLIC_ADSENSE_CLIENT=$/m);
    // The AdSense script URL appears in the ad component only, never in a layout.
    const src = path.join(root, "src");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (
          /\.(tsx?|js)$/.test(entry.name) &&
          fs.readFileSync(p, "utf8").includes("googlesyndication")
        )
          hits.push(path.relative(root, p));
      }
    };
    walk(src);
    expect(hits.sort()).toEqual([
      "src/components/monetization/ad-slot.tsx",
      "src/config/security.ts",
    ]);
  });

  it("the service worker never caches cross-origin (advertising) responses", () => {
    const sw = fs.readFileSync(path.join(root, "src/sw/service-worker.js"), "utf8");
    expect(sw).toContain("if (url.origin !== self.location.origin) return;");
    expect(sw).not.toMatch(/googlesyndication|doubleclick/);
  });
});

describe("AdSlot component", () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  async function renderSlot(
    env: Record<string, string>,
    nodeEnv: "development" | "production",
    consent = false,
  ) {
    vi.resetModules();
    const publicEnv = parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000", ...env });
    vi.doMock("@/config/env", () => ({ publicEnv }));
    vi.doMock("@/config/ads", async (importOriginal) => {
      const original = await importOriginal<typeof import("@/config/ads")>();
      const config = original.resolveAdsConfig(publicEnv, nodeEnv);
      return {
        ...original,
        adsConfig: () => config,
        isPlacementActive: (id: string) => config.active.has(id as never),
      };
    });
    vi.doMock("@/lib/consent/use-consent", () => ({
      useConsent: () => ({
        consent: { analytics: false, advertising: consent },
        hydrated: true,
        decided: true,
        update: () => {},
      }),
    }));
    const { AdSlot } = await import("@/components/monetization/ad-slot");
    const React = await import("react");
    const { render } = await import("@testing-library/react");
    return render(React.createElement(AdSlot, { placement: "tool-after-result" }));
  }

  it("renders nothing with the default configuration (no reserved space, no script)", async () => {
    const { container } = await renderSlot({}, "production", true);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when the placement is active but the visitor did not consent", async () => {
    const { container } = await renderSlot(fullyConfigured, "production", false);
    expect(container.innerHTML).toBe("");
  });

  it("shows a labelled, non-clickable simulation in development preview only", async () => {
    const dev = await renderSlot({ NEXT_PUBLIC_ADS_PREVIEW: "true" }, "development");
    const box = dev.getByTestId("ad-preview");
    expect(box.textContent).toContain("tool-after-result");
    expect(box.textContent).toMatch(/simulation/i);
    expect(dev.container.querySelector("a, button, ins, script")).toBeNull();
    dev.unmount();
    const prod = await renderSlot({ NEXT_PUBLIC_ADS_PREVIEW: "true" }, "production");
    expect(prod.container.innerHTML).toBe("");
  });

  it("reserves its size and labels the ad in the page language once allowed", async () => {
    const { container, getByTestId } = await renderSlot(fullyConfigured, "production", true);
    const slot = getByTestId("ad-slot-tool-after-result");
    expect(slot.getAttribute("aria-label")).toBe("Publicité");
    expect(slot.style.minHeight).toBe("300px");
    expect(container.querySelector("ins.adsbygoogle")?.getAttribute("data-ad-slot")).toBe("1");
    expect(container.querySelector("ins.adsbygoogle")?.getAttribute("data-ad-client")).toBe(
      "ca-pub-0000000000000000",
    );
  });
});
