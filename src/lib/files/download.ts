/**
 * Browser download helpers. Object URLs are revoked shortly after the click so
 * memory is released even for large results.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1500);
}

export function bytesToBlob(bytes: Uint8Array, type = "application/pdf"): Blob {
  // Copy into a fresh ArrayBuffer so SharedArrayBuffer-backed views are accepted everywhere.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}
