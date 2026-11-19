// AUTHORED-BY Claude Opus 5.5
/**
 * WCAG 2.1 contrast helpers for launcher tiles drawn in each app's own theme colour: the text
 * colour is chosen by computation, so a registry colour change can never ship unreadable text.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [match[1], match[2], match[3]].map((part) =>
    channel(parseInt(part ?? "0", 16)),
  );
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Contrast ratio between two `#rrggbb` colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** White or black, whichever reads better on `background` (always at least 4.5:1). */
export function textOn(background: string): "#FFFFFF" | "#000000" {
  return contrast(background, "#FFFFFF") >= contrast(background, "#000000") ? "#FFFFFF" : "#000000";
}
