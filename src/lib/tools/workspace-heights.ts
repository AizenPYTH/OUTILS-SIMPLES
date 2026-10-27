/**
 * Height (CSS px) of each tool's work area once loaded, measured on the
 * production build at 390 px (phones) and 1440 px (from the "sm" breakpoint
 * up) by `scripts/measure-workspace-heights.mjs`. Tools are client-only
 * components: while one loads, its slot reserves this height so that the
 * content below does not jump when it appears (CLS). Approximate by nature:
 * re-run the script after changing a tool's initial layout.
 */
export const workspaceHeights: Record<string, readonly [phone: number, wide: number]> = {
  "barcode-generate": [878, 444],
  "calc-dates": [740, 390],
  "calc-percent": [1232, 638],
  "calc-units": [812, 630],
  "calc-vat": [716, 506],
  "color-convert": [1175, 795],
  "dev-base64": [994, 872],
  "dev-csv-json": [719, 675],
  "dev-hash": [1020, 823],
  "dev-html-entities": [540, 490],
  "dev-json": [833, 763],
  "dev-password": [944, 698],
  "dev-timestamp": [940, 606],
  "dev-url-encode": [610, 568],
  "doc-calendar": [508, 278],
  "doc-cover": [762, 536],
  "doc-markdown-pdf": [1072, 714],
  "doc-paper": [980, 410],
  "doc-text-pdf": [976, 618],
  "image-palette": [294, 322],
  "qr-read": [374, 382],
  "text-case": [1040, 668],
  "text-clean": [993, 855],
  "text-diff": [847, 411],
  "text-slug": [581, 489],
  "text-word-counter": [900, 500],
};
