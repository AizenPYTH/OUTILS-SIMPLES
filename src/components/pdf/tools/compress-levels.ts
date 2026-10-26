import type { CompressionLevel } from "@/lib/pdf/operations/compress";

/** Level selector shared by the single-file and batch compression tools. */
export const compressionLevelOptions: {
  value: CompressionLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "structure",
    label: "Structure seule",
    description: "Sans perte : nettoyage du fichier",
  },
  { value: "balanced", label: "Équilibré", description: "Images JPEG qualité 75 %, 1 600 px max" },
  { value: "strong", label: "Maximal", description: "Images JPEG qualité 50 %, 1 200 px max" },
];
