import jsQR from "jsqr";

export interface QrDecoded {
  text: string;
  /** Detected content type for a friendlier display. */
  kind: "url" | "wifi" | "vcard" | "email" | "phone" | "sms" | "geo" | "text";
  corners: { x: number; y: number }[];
}

/** Decodes a QR code from RGBA pixels (works in workers and tests, no canvas). */
export function decodeQrFromRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): QrDecoded | null {
  const code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  if (!code || !code.data) return null;
  const l = code.location;
  return {
    text: code.data,
    kind: classifyQr(code.data),
    corners: [l.topLeftCorner, l.topRightCorner, l.bottomRightCorner, l.bottomLeftCorner],
  };
}

export function classifyQr(text: string): QrDecoded["kind"] {
  const t = text.trim();
  if (/^https?:\/\//i.test(t) || /^www\./i.test(t)) return "url";
  if (/^WIFI:/i.test(t)) return "wifi";
  if (/^BEGIN:VCARD/i.test(t)) return "vcard";
  if (/^mailto:/i.test(t)) return "email";
  if (/^tel:/i.test(t)) return "phone";
  if (/^smsto?:/i.test(t)) return "sms";
  if (/^geo:/i.test(t)) return "geo";
  return "text";
}

/** Parses WIFI:T:WPA;S:ssid;P:pass;; into fields (escaped characters unescaped). */
export function parseWifiPayload(
  text: string,
): { ssid: string; password: string; security: string; hidden: boolean } | null {
  if (!/^WIFI:/i.test(text)) return null;
  const fields: Record<string, string> = {};
  const body = text.slice(5);
  const re = /([A-Z]):((?:\\.|[^;\\])*);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) fields[m[1]!] = m[2]!.replace(/\\(.)/g, "$1");
  return {
    ssid: fields.S ?? "",
    password: fields.P ?? "",
    security: fields.T ?? "nopass",
    hidden: fields.H === "true",
  };
}
