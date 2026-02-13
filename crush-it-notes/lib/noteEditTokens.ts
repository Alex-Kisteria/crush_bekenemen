const STORAGE_KEY = "crushit_note_edit_tokens_v1";

type TokenMap = Record<string, string>;

function readMap(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as TokenMap) ?? {};
  } catch {
    return {};
  }
}

function writeMap(map: TokenMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getEditToken(noteId: string): string | null {
  const map = readMap();
  return map[noteId] ?? null;
}

export function setEditToken(noteId: string, token: string) {
  const map = readMap();
  map[noteId] = token;
  writeMap(map);
}

export function removeEditToken(noteId: string) {
  const map = readMap();
  delete map[noteId];
  writeMap(map);
}