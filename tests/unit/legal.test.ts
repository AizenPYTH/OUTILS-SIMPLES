import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { isLegalIdentityIncomplete, publisherKind } from "@/lib/legal";

const empty = siteConfig.legal;
const filled = {
  ...empty,
  publisherName: "Nom",
  publisherAddress: "Adresse",
  contactEmail: "contact@site.zz",
  hostingProvider: "Hébergeur",
  hostingAddress: "Adresse",
  hostingPhone: "+00",
};

describe("publisher identity", () => {
  it("uses the private-person wording until a kind is chosen, and stays incomplete", () => {
    expect(publisherKind({ ...filled, publisherKind: "" })).toBe("individual");
    expect(isLegalIdentityIncomplete({ ...filled, publisherKind: "" })).toBe(true);
  });

  it("requires no company details from a private person", () => {
    expect(isLegalIdentityIncomplete({ ...filled, publisherKind: "individual" })).toBe(false);
    expect(
      isLegalIdentityIncomplete({ ...filled, publisherKind: "individual", hostingPhone: "" }),
    ).toBe(true);
    expect(isLegalIdentityIncomplete({ ...filled, publisherKind: "company" })).toBe(true);
  });

  it("asks only for the host and a contact in the anonymous mode", () => {
    expect(
      isLegalIdentityIncomplete({
        ...empty,
        publisherKind: "anonymous",
        contactEmail: "contact@site.zz",
        hostingProvider: "Hébergeur",
        hostingAddress: "Adresse",
      }),
    ).toBe(false);
  });
});
