/**
 * Participant color encoding — design-system soft tokens (background, edge, ink).
 */

export const participantPalette = [
  { token: "p1", hex: "#6F9FEF", bg: "#E3EEFF", edge: "#6F9FEF", ink: "#173B6A" },
  { token: "p2", hex: "#DF7F96", bg: "#FBE5EA", edge: "#DF7F96", ink: "#66243A" },
  { token: "p3", hex: "#6BAE8C", bg: "#E1F3EA", edge: "#6BAE8C", ink: "#194A35" },
  { token: "p4", hex: "#D6A64D", bg: "#FFF0CE", edge: "#D6A64D", ink: "#5A3C08" },
  { token: "p5", hex: "#9B7FD0", bg: "#EEE7FA", edge: "#9B7FD0", ink: "#3F2B64" },
  { token: "p6", hex: "#8A949D", bg: "#E9ECEF", edge: "#8A949D", ink: "#30363B" },
  { token: "p7", hex: "#6F9FEF", bg: "#E3EEFF", edge: "#6F9FEF", ink: "#173B6A" },
  { token: "p8", hex: "#DF7F96", bg: "#FBE5EA", edge: "#DF7F96", ink: "#66243A" }
] as const;

export type ParticipantTokens = {
  bg: string;
  edge: string;
  ink: string;
};

export function colorTokenForIndex(index: number): string {
  return participantPalette[index % participantPalette.length].token;
}

export function hexForToken(token: string): string {
  return participantPalette.find((entry) => entry.token === token)?.hex ?? "#8A949D";
}

export function tokensForHex(hex: string): ParticipantTokens {
  const entry =
    participantPalette.find((p) => p.hex === hex || p.edge === hex) ??
    participantPalette[participantPalette.length - 1];
  return { bg: entry.bg, edge: entry.edge, ink: entry.ink };
}

export function tokensForToken(token: string): ParticipantTokens {
  const entry = participantPalette.find((p) => p.token === token) ?? participantPalette[5];
  return { bg: entry.bg, edge: entry.edge, ink: entry.ink };
}

/** Short initials for participant badge (e.g. "P1" or first two letters). */
export function initialsFromLabel(label: string): string {
  const trimmed = label.trim();
  if (/^P\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase() || "?";
}

export function densityBackground(hex: string, participantCount: number): string {
  const { bg } = tokensForHex(hex);
  const clamped = Math.min(Math.max(participantCount, 1), 6);
  const alpha = 0.35 + (clamped - 1) * 0.08;
  return blendAlpha(bg, alpha);
}

export function densityBackgroundFromRatio(hex: string, ratio: number): string {
  const { bg } = tokensForHex(hex);
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return blendAlpha(bg, 0.35 + clamped * 0.45);
}

/** @deprecated Use tokensForHex instead. */
export function tintForHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(tokensForHex(hex).edge);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function blendAlpha(hex: string, alpha: number): string {
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
