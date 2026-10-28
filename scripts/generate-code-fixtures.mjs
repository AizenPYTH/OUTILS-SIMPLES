// Generates tests/fixtures/qr-averopdf.png (a QR code pointing to https://averopdf.fr/aide).
import { writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
const out = path.resolve(process.cwd(), "tests/fixtures/qr-averopdf.png");
await writeFile(
  out,
  await QRCode.toBuffer("https://averopdf.fr/aide", {
    type: "png",
    width: 320,
    margin: 4,
    errorCorrectionLevel: "M",
  }),
);
console.log("written", out);
