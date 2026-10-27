/** Builds the string encoded in a QR code for each supported kind (pure, tested). */
import { tr } from "@/lib/i18n/messages";

export type QrKind = "url" | "text" | "wifi" | "vcard";

export interface WifiPayload {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

export interface VCardPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  url: string;
}

export interface QrPayloadResult {
  value: string;
  error: string | null;
}

function escapeWifi(value: string): string {
  return value.replace(/([\;,:"])/g, "\\$1");
}

function escapeVCard(value: string): string {
  return value.replace(/([\;,])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildQrPayload(
  kind: QrKind,
  input: { url: string; text: string; wifi: WifiPayload; card: VCardPayload },
): QrPayloadResult {
  switch (kind) {
    case "url": {
      const value = input.url.trim();
      if (!value || value === "https://" || value === "http://") return { value: "", error: null };
      if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return { value: `https://${value}`, error: null };
      return { value, error: null };
    }
    case "text":
      return {
        value: input.text,
        error:
          input.text.length > 2000
            ? tr("Texte trop long pour un QR code lisible (2 000 caractères max).")
            : null,
      };
    case "wifi": {
      const { ssid, password, security, hidden } = input.wifi;
      if (!ssid.trim()) return { value: "", error: null };
      if (security !== "nopass" && !password)
        return {
          value: "",
          error: tr("Indiquez le mot de passe du réseau (ou choisissez « Aucune »)."),
        };
      const parts = [
        `WIFI:T:${security};`,
        `S:${escapeWifi(ssid)};`,
        security !== "nopass" ? `P:${escapeWifi(password)};` : "",
        hidden ? "H:true;" : "",
        ";",
      ];
      return { value: parts.join(""), error: null };
    }
    case "vcard": {
      const c = input.card;
      if (!c.firstName.trim() && !c.lastName.trim()) return { value: "", error: null };
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(c.lastName)};${escapeVCard(c.firstName)};;;`,
        `FN:${escapeVCard(`${c.firstName} ${c.lastName}`.trim())}`,
      ];
      if (c.organization) lines.push(`ORG:${escapeVCard(c.organization)}`);
      if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone.replace(/\s+/g, "")}`);
      if (c.email) lines.push(`EMAIL:${c.email.trim()}`);
      if (c.url) lines.push(`URL:${c.url.trim()}`);
      lines.push("END:VCARD");
      return { value: lines.join("\n"), error: null };
    }
  }
}
