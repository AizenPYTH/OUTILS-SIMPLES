import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const script = path.resolve(__dirname, "../../scripts/check-launch-env.mjs");

function run(env: Record<string, string>, ...args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    env: { PATH: process.env.PATH ?? "", NODE_ENV: "test", ...env },
    encoding: "utf8",
  });
  return { status: result.status, out: String(result.stdout) };
}

// Test values only. ".zz" is an ISO 3166 user-assigned code that is never
// delegated as a top-level domain: a syntactically valid, non-existent site.
const complete = {
  NEXT_PUBLIC_SITE_URL: "https://averopdf.zz",
  NEXT_PUBLIC_LEGAL_PUBLISHER_NAME: "Éditeur",
  NEXT_PUBLIC_LEGAL_PUBLISHER_STATUS: "particulier",
  NEXT_PUBLIC_LEGAL_PUBLISHER_ADDRESS: "1 rue",
  NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR: "D.",
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: "contact@averopdf.example",
  NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER: "Hébergeur",
  NEXT_PUBLIC_LEGAL_HOSTING_ADDRESS: "2 rue",
};

describe("launch readiness check", () => {
  it("fails when the legal identity or the site URL is missing", () => {
    const { status, out } = run({});
    expect(status).toBe(1);
    expect(out).toContain("NEXT_PUBLIC_SITE_URL absente");
    expect(out).toContain("NEXT_PUBLIC_LEGAL_PUBLISHER_NAME absente");
    expect(run({}, "--warn").status).toBe(0);
  });

  it("rejects test addresses, http and placeholder values", () => {
    expect(run({ ...complete, NEXT_PUBLIC_SITE_URL: "http://averopdf.example" }).out).toContain(
      "https",
    );
    for (const reserved of [
      "https://example.invalid",
      "https://www.example.org",
      "https://example.net",
      "https://averopdf.example",
      "https://averopdf.test",
      "https://preview.localhost",
    ])
      expect(run({ ...complete, NEXT_PUBLIC_SITE_URL: reserved }).out, reserved).toContain(
        "adresse de test",
      );
    expect(run({ ...complete, NEXT_PUBLIC_LEGAL_PUBLISHER_NAME: "à compléter" }).out).toContain(
      "valeur de remplissage",
    );
    expect(run({ ...complete, NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: "nope" }).status).toBe(1);
  });

  it("passes with a complete configuration and flags enabled third parties", () => {
    const ok = run(complete);
    expect(ok.status).toBe(0);
    expect(ok.out).toContain("0 bloquant(s)");
    const ads = run({ ...complete, NEXT_PUBLIC_ADS_ENABLED: "true" });
    expect(ads.status).toBe(1);
    expect(ads.out).toContain("NEXT_PUBLIC_ADSENSE_CLIENT");
    expect(run({ ...complete, NEXT_PUBLIC_ANALYTICS_PROVIDER: "plausible" }).status).toBe(1);
  });
});

describe("preview no-index switch", () => {
  it("is refused in a production configuration", () => {
    const { status, out } = run({ ...complete, NEXT_PUBLIC_NOINDEX: "true" });
    expect(status).toBe(1);
    expect(out).toContain("NEXT_PUBLIC_NOINDEX");
  });
});
