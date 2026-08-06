/**
 * Return black or white — whichever is more legible on top of the given hex color.
 * Uses the WCAG relative-luminance formula.
 */
export function getContrastColor(hex) {
  const clean = (hex || "").replace("#", "");
  if (clean.length !== 6) return "#1a1a2e";

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.5 ? "#1a1a2e" : "#ffffff";
}
