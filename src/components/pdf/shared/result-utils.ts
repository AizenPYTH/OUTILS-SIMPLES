import { bytesToBlob, triggerDownload } from "@/lib/files/download";
import { deriveOutputName } from "@/lib/files/filename";
import { track } from "@/lib/analytics/events";

export function downloadPdf(bytes: Uint8Array, originalName: string, suffix: string, toolId: string): void {
  triggerDownload(bytesToBlob(bytes), deriveOutputName(originalName, suffix));
  track("tool_download", { tool: toolId });
}

export function downloadZip(bytes: Uint8Array, originalName: string, suffix: string, toolId: string): void {
  triggerDownload(bytesToBlob(bytes, "application/zip"), deriveOutputName(originalName, suffix, "zip"));
  track("tool_download", { tool: toolId, option: "zip" });
}
