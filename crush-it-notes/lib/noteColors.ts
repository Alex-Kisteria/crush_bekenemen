export const ALLOWED_NOTE_COLORS = [
  "#FFB3BA",
  "#F95579",
  "#FF8AB3",
  "#FFC4DD",
  "#FFE5E5",
] as const;

const ALLOWED = new Set<string>(ALLOWED_NOTE_COLORS);
export const DEFAULT_NOTE_COLOR = "#FFE5E5";

export function normalizeNoteColor(input: unknown) {
  if (typeof input !== "string") return DEFAULT_NOTE_COLOR;
  const s = input.trim();
  return ALLOWED.has(s) ? s : DEFAULT_NOTE_COLOR;
}