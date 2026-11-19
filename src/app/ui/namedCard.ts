import { CARD_INK, type CardLang, type NameLayout } from "@/lib/cardName";

// Writes a guest's name and place onto page 1 of their invitation card, in the
// browser. The letters are drawn by the browser (which joins Marathi letters
// correctly; PDF libraries don't) and placed on the page as a picture, so the
// card's own pages stay sharp. A PDF card stays a PDF (all its pages); an image
// card comes back as a JPEG.

const SCALE = 4; // canvas pixels per PDF point: sharp when printed or zoomed

interface Drawn {
  canvas: HTMLCanvasElement;
  /** Pixels from the canvas top to the text's baseline. */
  baseline: number;
}

/** One line of text on its own canvas, shrunk to fit `maxWidth` (pixels), at most `fontPx` high. */
async function drawLine(text: string, fontPx: number, maxWidth: number, family: string, lang: CardLang): Promise<Drawn> {
  const style = lang === "en" ? "italic " : "";
  await document.fonts.load(`${style}${Math.round(fontPx)}px ${family}`, text);
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  let px = fontPx;
  g.font = `${style}${px}px ${family}`;
  const natural = g.measureText(text).width;
  if (natural > maxWidth) px = Math.max(fontPx * 0.55, (fontPx * maxWidth) / natural);
  g.font = `${style}${px}px ${family}`;
  const m = g.measureText(text);
  const ascent = Math.ceil(Math.max(m.actualBoundingBoxAscent, px * 0.9)) + 4;
  const descent = Math.ceil(Math.max(m.actualBoundingBoxDescent, px * 0.3)) + 4;
  c.width = Math.max(1, Math.ceil(Math.min(m.width, maxWidth)) + 4);
  c.height = ascent + descent;
  // Resizing a canvas resets its drawing state.
  g.font = `${style}${px}px ${family}`;
  g.fillStyle = CARD_INK;
  g.textBaseline = "alphabetic";
  g.fillText(text, 0, ascent);
  return { canvas: c, baseline: ascent };
}

function canvasPng(c: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    c.toBlob(async (b) => (b ? resolve(new Uint8Array(await b.arrayBuffer())) : reject(new Error("canvas"))), "image/png"),
  );
}

/**
 * The card with the lines written in. `type` is the card's file type
 * ("application/pdf" or an image type); `family` the CSS font family.
 */
export async function makeNamedCard(file: ArrayBuffer, type: string, lines: string[], layout: NameLayout, family: string, lang: CardLang): Promise<Blob> {
  if (type === "application/pdf") {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(file);
    const page = pdf.getPage(0);
    const { width: W, height: H } = page.getSize();
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      const d = await drawLine(lines[i], layout.size * H * SCALE, layout.w * W * SCALE, family, lang);
      const img = await pdf.embedPng(await canvasPng(d.canvas));
      const baselineFromTop = (layout.y1 + i * layout.gap) * H;
      page.drawImage(img, {
        x: layout.x * W,
        // PDF measures from the bottom: the picture's bottom edge sits below the baseline by its descent.
        y: H - baselineFromTop - (d.canvas.height - d.baseline) / SCALE,
        width: d.canvas.width / SCALE,
        height: d.canvas.height / SCALE,
      });
    }
    const bytes = await pdf.save();
    return new Blob([bytes as BlobPart], { type: "application/pdf" });
  }

  // An image card: draw it, write on it, and save it as a JPEG.
  const url = URL.createObjectURL(new Blob([file], { type }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image"));
      i.src = url;
    });
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      const d = await drawLine(lines[i], layout.size * H, layout.w * W, family, lang);
      g.drawImage(d.canvas, layout.x * W, (layout.y1 + i * layout.gap) * H - d.baseline);
    }
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}
