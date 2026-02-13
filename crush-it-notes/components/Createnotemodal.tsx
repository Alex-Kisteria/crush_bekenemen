"use client";

import { useMemo, useState } from "react";

type Track = {
  id: string;
  name: string;
  artists: string;
  image: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
};

interface CreateNoteModalProps {
  isOpen: boolean;
  isPosting?: boolean;

  author: string;
  to: string;
  content: string;

  selectedColor: string;
  colors: string[];

  selectedTrack: Track | null;

  onAuthorChange: (author: string) => void;
  onToChange: (to: string) => void;
  onContentChange: (content: string) => void;
  onColorChange: (color: string) => void;

  onSelectTrack: (track: Track | null) => void;

  onClose: () => void;
  onCreate: () => void;
}

export default function CreateNoteModal({
  isOpen,
  isPosting = false,
  author,
  to,
  content,
  selectedColor,
  colors,
  selectedTrack,
  onAuthorChange,
  onToChange,
  onContentChange,
  onColorChange,
  onSelectTrack,
  onClose,
  onCreate,
}: CreateNoteModalProps) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSearch = query.trim().length >= 2;

  const selectedLabel = useMemo(() => {
    if (!selectedTrack) return "No song selected";
    return `${selectedTrack.name} — ${selectedTrack.artists}`;
  }, [selectedTrack]);

  const doSearch = async () => {
    if (!canSearch) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(
        `/api/spotify/search?query=${encodeURIComponent(query.trim())}`,
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as { tracks: any[] };

      const mapped: Track[] = (data.tracks ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        image: t.image ?? null,
        previewUrl: t.previewUrl ?? null,
        spotifyUrl: t.spotifyUrl,
      }));

      setTracks(mapped);
    } catch (e: any) {
      setErr(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-[920px] border border-rose-100 max-h-[70vh] overflow-auto scrollbar-hide">
        <h2 className="text-xl font-bold text-rose-900 mb-4">Create a Note</h2>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[40%]">
          {/* LEFT: note info */}
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input
                value={author}
                onChange={(e) => onAuthorChange(e.target.value)}
                placeholder="From (optional)"
                className="w-full p-3 border-2 border-rose-200 rounded-2xl focus:outline-none focus:border-rose-400 text-gray-800 placeholder-rose-300"
                disabled={isPosting}
                style={{ fontFamily: "'Indie Flower', cursive" }}
              />
              <input
                value={to}
                onChange={(e) => onToChange(e.target.value)}
                placeholder="To (optional)"
                className="w-full p-3 border-2 border-rose-200 rounded-2xl focus:outline-none focus:border-rose-400 text-gray-800 placeholder-rose-300"
                disabled={isPosting}
                style={{ fontFamily: "'Indie Flower', cursive" }}
              />
            </div>

            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Write your message..."
              className="w-full h-30 p-4 border-2 border-rose-200 rounded-2xl resize-none focus:outline-none focus:border-rose-400 text-gray-800 placeholder-rose-300"
              autoFocus
              disabled={isPosting}
              style={{ fontFamily: "'Indie Flower', cursive" }}
            />

            <div className="mt-4">
              <label className="text-sm font-medium text-rose-900 mb-3 block">
                Choose a color:
              </label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onColorChange(color)}
                    disabled={isPosting}
                    className="w-8 h-8 rounded-lg transition-transform hover:scale-110 disabled:opacity-60"
                    style={{
                      backgroundColor: color,
                      border:
                        selectedColor === color
                          ? "3px solid #e11d48"
                          : "2px solid #fecdd3",
                      transform:
                        selectedColor === color ? "scale(1.1)" : "scale(1)",
                    }}
                    aria-label={`Pick color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: music */}
          <div className="min-w-0">
            <div className="text-sm font-medium text-rose-900 mb-2">
              Attach a song (optional)
            </div>

            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                placeholder="Search Spotify tracks..."
                className="flex-1 px-3 py-2 rounded-xl border-2 border-rose-200 outline-none focus:border-rose-400 bg-white text-rose-900 text-sm"
                disabled={isPosting}
              />
              <button
                type="button"
                onClick={doSearch}
                disabled={!canSearch || loading || isPosting}
                className="px-4 py-2 rounded-xl bg-pink-500 text-white font-semibold disabled:opacity-50"
              >
                {loading ? "..." : "Search"}
              </button>
            </div>

            {err && <div className="mt-2 text-sm text-rose-700">{err}</div>}

            <div className="mt-2 text-xs text-rose-800/70">
              Selected: <span className="font-semibold">{selectedLabel}</span>
              {selectedTrack && (
                <button
                  type="button"
                  onClick={() => onSelectTrack(null)}
                  disabled={isPosting}
                  className="ml-2 underline"
                >
                  clear
                </button>
              )}
            </div>

            <div className="mt-3 max-h-[200px] overflow-auto flex flex-col gap-2 pr-1 scrollbar-rose">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTrack(t)}
                  disabled={isPosting}
                  className="w-full text-left p-2 rounded-xl border border-rose-100 hover:bg-rose-50 disabled:opacity-60 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[10px] text-rose-700/60">No img</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-rose-900 truncate">
                      {t.name}
                    </div>
                    <div className="text-xs text-rose-800/70 truncate">
                      {t.artists}
                      {!t.previewUrl ? " • no preview" : ""}
                    </div>
                  </div>
                </button>
              ))}
              {tracks.length === 0 && (
                <div className="text-sm text-rose-800/60 border border-rose-100 rounded-2xl p-4">
                  Search for a song to attach it to your note.
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                disabled={isPosting}
                className="flex-1 px-6 py-2 border-2 border-rose-300 text-rose-700 text-sm rounded-xl font-medium hover:bg-rose-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={isPosting}
                className="flex-1 px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm rounded-xl font-medium hover:scale-105 transition-transform shadow-md disabled:opacity-70 disabled:hover:scale-100"
              >
                {isPosting ? "..." : "Post Note ♡"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        {/* <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            disabled={isPosting}
            className="flex-1 px-6 py-2 border-2 border-rose-300 text-rose-700 rounded-2xl font-medium hover:bg-rose-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={isPosting}
            className="flex-1 px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-medium hover:scale-105 transition-transform shadow-md disabled:opacity-70 disabled:hover:scale-100"
          >
            {isPosting ? "..." : "Post Note ♡"}
          </button>
        </div> */}
      </div>
    </div>
  );
}
