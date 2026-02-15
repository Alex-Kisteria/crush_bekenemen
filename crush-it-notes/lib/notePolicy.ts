export const NOTE_ROTATION_MIN = -12;
export const NOTE_ROTATION_MAX = 12;

export function normalizeRotation(input: unknown) {
  const n = typeof input === "string" ? Number(input) : (input as number);
  if (!Number.isFinite(n)) return 0;
  return Math.max(NOTE_ROTATION_MIN, Math.min(NOTE_ROTATION_MAX, n));
}