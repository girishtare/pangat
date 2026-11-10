import { encode } from "uqr";

/**
 * A QR code as one SVG path (1 unit = 1 module), merged into horizontal runs
 * so a printed sheet of slips stays small. Medium error correction survives a
 * crease or a smudge on a printed slip.
 */
export function qrPath(text: string): { size: number; d: string } {
  const { data, size } = encode(text, { ecc: "M", border: 0 });
  let d = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y][x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < size && data[y][x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { size, d };
}
