/**
 * Zoom model of the editor, kept as pure functions so the arithmetic is
 * testable: the single source of truth is the absolute `scale` (CSS pixels
 * per PDF point). 100 % is the actual size at 96 dpi (96 / 72 px per point),
 * the convention of pdf.js, Acrobat and browsers. "Fit" modes compute a scale
 * from the container; zooming by hand leaves fit mode.
 */
export const ACTUAL_SIZE_SCALE = 96 / 72;
export const ZOOM_PERCENT_STEPS = [25, 50, 75, 100, 125, 150, 200, 300, 400] as const;
export const ZOOM_MIN_PERCENT = 25;
export const ZOOM_MAX_PERCENT = 400;

export type FitMode = "width" | "page" | null;

export function percentOf(scale: number): number {
  return (scale / ACTUAL_SIZE_SCALE) * 100;
}

export function scaleOfPercent(percent: number): number {
  return (percent / 100) * ACTUAL_SIZE_SCALE;
}

export function clampScale(scale: number): number {
  return Math.min(
    scaleOfPercent(ZOOM_MAX_PERCENT),
    Math.max(scaleOfPercent(ZOOM_MIN_PERCENT), scale),
  );
}

/** Next zoom step in the given direction from any (possibly intermediate) scale. */
export function stepScale(scale: number, direction: 1 | -1): number {
  const percent = percentOf(scale);
  const epsilon = 0.5;
  if (direction === 1) {
    const next = ZOOM_PERCENT_STEPS.find((p) => p > percent + epsilon);
    return scaleOfPercent(next ?? ZOOM_MAX_PERCENT);
  }
  const previous = [...ZOOM_PERCENT_STEPS].reverse().find((p) => p < percent - epsilon);
  return scaleOfPercent(previous ?? ZOOM_MIN_PERCENT);
}

/** Multiplicative zoom for a wheel delta (pixels): ±100 px ≈ one 16 % notch. */
export function wheelScale(scale: number, deltaY: number, deltaMode: number): number {
  // DOM_DELTA_LINE (Firefox mouse wheels) reports ~3 lines per notch; DOM_DELTA_PAGE is rare.
  const pixels = deltaMode === 1 ? deltaY * 33 : deltaMode === 2 ? deltaY * 300 : deltaY;
  const factor = Math.exp(-Math.max(-300, Math.min(300, pixels)) * 0.0015);
  return clampScale(scale * factor);
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Widest page, in CSS px, that the "width" fit produces: beyond it lines get
 * too long to read on large monitors, so the page stays centred instead.
 */
export const FIT_WIDTH_MAX_CSS_PX = 920;

/**
 * Scale that fits a page (visual size in points) into the container (CSS px
 * available for content). "width" (the default) fills the available width, up
 * to FIT_WIDTH_MAX_CSS_PX, and lets the page scroll vertically like a reader,
 * while keeping at least half of the page on screen on short displays;
 * "page" shows the whole page. Both are capped at 400 % and never below 25 %.
 * Only the display scale changes: document and annotation coordinates are in
 * PDF points and do not depend on it.
 */
export function fitScaleFor(mode: Exclude<FitMode, null>, page: Size, container: Size): number {
  const width = Math.max(100, container.width);
  const height = Math.max(100, container.height);
  const byWidth = width / page.width;
  if (mode === "width")
    return clampScale(
      Math.min(byWidth, FIT_WIDTH_MAX_CSS_PX / page.width, (2 * height) / page.height),
    );
  return clampScale(Math.min(byWidth, height / page.height));
}

export interface ScrollState {
  scrollLeft: number;
  scrollTop: number;
}

/**
 * Scroll offsets that keep the document point under the pointer fixed when the
 * scale changes. `pointer` is relative to the scroll container's content box;
 * `pageOffset` is where the page starts inside the scrolled content at the NEW
 * scale (the centering margin can change when the page becomes smaller than
 * the container); `pageOffsetBefore` the same at the old scale.
 */
export function anchoredScroll(
  before: ScrollState,
  pointer: { x: number; y: number },
  oldScale: number,
  newScale: number,
  pageOffsetBefore: { x: number; y: number },
  pageOffset: { x: number; y: number },
): ScrollState {
  const ratio = newScale / oldScale;
  // Point under the pointer, in page CSS px at the old scale.
  const px = before.scrollLeft + pointer.x - pageOffsetBefore.x;
  const py = before.scrollTop + pointer.y - pageOffsetBefore.y;
  return {
    scrollLeft: Math.max(0, pageOffset.x + px * ratio - pointer.x),
    scrollTop: Math.max(0, pageOffset.y + py * ratio - pointer.y),
  };
}

/** Human label of the zoom level. */
export function zoomLabel(scale: number): string {
  return `${Math.round(percentOf(scale))} %`;
}
