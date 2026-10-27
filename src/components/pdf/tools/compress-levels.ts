import type { CompressionLevel } from "@/lib/pdf/operations/compress";
import { tr } from "@/lib/i18n/messages";

/** Level selector shared by the single-file and batch compression tools. */
export const compressionLevelOptions: {
  value: CompressionLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "structure",
    label: tr("Structure seule"),
    description: tr("Sans perte : nettoyage du fichier"),
  },
  {
    value: "balanced",
    label: tr("Équilibré"),
    description: tr("Images JPEG qualité 75 %, 1 600 px max"),
  },
  {
    value: "strong",
    label: tr("Maximal"),
    description: tr("Images JPEG qualité 50 %, 1 200 px max"),
  },
];
