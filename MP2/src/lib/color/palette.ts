/**
 * Participant color encoding.
 *
 * Colors are assigned by participant order within a workspace and stored as a
 * token on the participant record, which keeps them stable across the whole
 * workspace (re-ingesting the same participant reuses the same token).
 */

export const participantPalette = [
  { token: "p1", hex: "#2563eb" },
  { token: "p2", hex: "#db2777" },
  { token: "p3", hex: "#16a34a" },
  { token: "p4", hex: "#d97706" },
  { token: "p5", hex: "#7c3aed" },
  { token: "p6", hex: "#0891b2" },
  { token: "p7", hex: "#dc2626" },
  { token: "p8", hex: "#4b5563" }
] as const;

export function colorTokenForIndex(index: number): string {
  return participantPalette[index % participantPalette.length].token;
}

export function hexForToken(token: string): string {
  return participantPalette.find((entry) => entry.token === token)?.hex ?? "#4b5563";
}

/**
 * Cross-participant emphasis: stronger color density for insights mentioned by
 * more participants. Returns an rgba-style background derived from the base hex.
 */
export function densityBackground(hex: string, participantCount: number): string {
  const clamped = Math.min(Math.max(participantCount, 1), 6);
  const alpha = 0.12 + (clamped - 1) * 0.12;
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/**
 * Color density indicator driven by the stored mentionDensity ratio (0..1).
 * Higher cross-participant mention => denser background fill.
 */
export function densityBackgroundFromRatio(hex: string, ratio: number): string {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const alpha = 0.12 + clamped * 0.55;
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}
