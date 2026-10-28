/** Text watermark drawn on a canvas (browser only). */

export type WatermarkPosition =
  "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tile";

export interface WatermarkSettings {
  text: string;
  /** 0–1 */
  opacity: number;
  /** Font size as a percentage of the image width (1–30). */
  sizePercent: number;
  color: string;
  position: WatermarkPosition;
  /** Degrees, counter-clockwise positive. */
  rotation: number;
  font: "sans" | "serif" | "mono";
}

export const defaultWatermarkSettings: WatermarkSettings = {
  text: "© AVEROPDF",
  opacity: 0.4,
  sizePercent: 6,
  color: "#ffffff",
  position: "bottom-right",
  rotation: 0,
  font: "sans",
};

const FONTS = {
  sans: "'Instrument Sans', Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', monospace",
};

export function drawTextWatermark(canvas: HTMLCanvasElement, settings: WatermarkSettings): void {
  const ctx = canvas.getContext("2d");
  if (!ctx || !settings.text.trim()) return;
  const size = Math.max(8, (canvas.width * settings.sizePercent) / 100);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, settings.opacity));
  ctx.fillStyle = settings.color;
  ctx.font = `600 ${size}px ${FONTS[settings.font]}`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.08;
  const margin = size * 0.6;
  const metrics = ctx.measureText(settings.text);
  const textWidth = metrics.width;
  const angle = (-settings.rotation * Math.PI) / 180;

  const drawAt = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.textAlign = "center";
    ctx.fillText(settings.text, 0, 0);
    ctx.restore();
  };

  if (settings.position === "tile") {
    const stepX = textWidth + size * 2;
    const stepY = size * 3;
    let row = 0;
    for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
      const offset = row % 2 === 0 ? 0 : stepX / 2;
      for (let x = -stepX; x < canvas.width + stepX; x += stepX) drawAt(x + offset, y);
      row += 1;
    }
  } else if (settings.position === "center") {
    drawAt(canvas.width / 2, canvas.height / 2);
  } else {
    const halfW = textWidth / 2;
    const x = settings.position.endsWith("left") ? margin + halfW : canvas.width - margin - halfW;
    const y = settings.position.startsWith("top")
      ? margin + size / 2
      : canvas.height - margin - size / 2;
    drawAt(x, y);
  }
  ctx.restore();
}
