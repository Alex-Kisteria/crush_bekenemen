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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/5 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPosting) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-500"
        style={{
          backgroundColor: selectedColor,
          transform: "rotate(-0.5deg)",
        }}
      >
        {/* Tape effect at top */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/30 rounded-b-lg border-t-2 border-white/50 shadow-sm" />

          <button
            type="button"
            onClick={onClose}
            disabled={isPosting}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-400/80 text-white flex items-center justify-center hover:bg-rose-500 transition-all shadow-md z-10 disabled:opacity-50"
            title="Close"
          >
            ×
          </button>

          <div className="text-gray-800 font-note text-base leading-tight pt-2">
            <h2 className="text-2xl font-bold text-rose-900/90 mb-1">
              Create Your Note
            </h2>
            <p className="text-sm text-rose-800/70">
              Share your message with someone special
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT: Note content */}
            <div className="min-w-0">
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-black/5 shadow-inner mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    value={author}
                    onChange={(e) => onAuthorChange(e.target.value)}
                    placeholder="From (optional)"
                    className="w-full px-3 py-2 border-2 border-rose-200/50 rounded-xl focus:outline-none focus:border-rose-400 bg-white/60 text-gray-800 placeholder-rose-800/60 text-sm font-note"
                    disabled={isPosting}
                  />
                  <input
                    value={to}
                    onChange={(e) => onToChange(e.target.value)}
                    placeholder="To (optional)"
                    className="w-full px-3 py-2 border-2 border-rose-200/50 rounded-xl focus:outline-none focus:border-rose-400 bg-white/60 text-gray-800 placeholder-rose-800/60 text-sm font-note"
                    disabled={isPosting}
                  />
                </div>

                <textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Write your message here... ♡"
                  className="w-full h-32 px-3 py-2 border-2 border-rose-200/50 rounded-xl resize-none focus:outline-none focus:border-rose-400 bg-white/60 text-gray-800 placeholder-rose-800/60 text-sm font-note"
                  autoFocus
                  disabled={isPosting}
                />
              </div>

              {/* Color picker */}
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-black/5 shadow-inner">
                <label className="text-sm font-semibold text-rose-900/90 mb-2 block font-note">
                  Pick a color:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onColorChange(color)}
                      disabled={isPosting}
                      className="w-10 h-10 rounded-xl transition-transform hover:scale-110 disabled:opacity-60 shadow-md"
                      style={{
                        backgroundColor: color,
                        border:
                          selectedColor === color
                            ? "3px solid #e11d48"
                            : "2px solid #fecdd3",
                        transform:
                          selectedColor === color ? "scale(1.15)" : "scale(1)",
                      }}
                      aria-label={`Pick color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Music attachment */}
            <div className="min-w-0">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-black/5 shadow-inner flex flex-col max-h-[400px]">
                <div className="text-sm font-semibold text-rose-900/90 mb-3 font-note">
                  Attach a song (optional)
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") doSearch();
                    }}
                    placeholder="Search Spotify..."
                    className="flex-1 px-3 py-2 rounded-xl border-2 border-rose-200/50 outline-none focus:border-rose-400 bg-white/80 text-rose-900 text-sm font-note placeholder-rose-400/60"
                    disabled={isPosting}
                  />
                  <button
                    type="button"
                    onClick={doSearch}
                    disabled={!canSearch || loading || isPosting}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-md disabled:opacity-50"
                  >
                    {loading ? "..." : "Search"}
                  </button>
                </div>

                {err && (
                  <div className="mb-2 text-xs text-rose-700 bg-rose-100/50 rounded-lg px-2 py-1">
                    {err}
                  </div>
                )}

                <div className="mb-2 text-xs text-rose-800/70 bg-white/50 rounded-lg px-2 py-1 flex items-center justify-between shrink-0">
                  <span className="truncate">
                    <span className="font-semibold">Selected:</span>{" "}
                    {selectedLabel}
                  </span>
                  {selectedTrack && (
                    <button
                      type="button"
                      onClick={() => onSelectTrack(null)}
                      disabled={isPosting}
                      className="ml-2 text-rose-600 hover:text-rose-800 underline"
                    >
                      clear
                    </button>
                  )}
                </div>

                {/* Track results - scrollable area */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-2 pr-1 scrollbar-rose">
                  {tracks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTrack(t)}
                      disabled={isPosting}
                      className="w-full text-left p-2 rounded-xl border border-rose-100 bg-white/60 hover:bg-white/90 disabled:opacity-60 flex items-center gap-3 transition-all shadow-sm shrink-0"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm">
                        {t.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[10px] text-rose-700/60">
                            No img
                          </div>
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
                    <div className="text-sm text-rose-800/60 border border-rose-200/50 bg-white/40 rounded-xl p-4 text-center font-note">
                      Search for a song to attach 🎶
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPosting}
              className="flex-1 px-6 py-3 border-2 border-white/50 bg-white/30 backdrop-blur-sm text-rose-900 text-sm rounded-xl font-semibold hover:bg-white/50 transition-all disabled:opacity-60 shadow-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={isPosting || !content.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:hover:scale-100"
            >
              {isPosting ? "Posting..." : "Post Note ♡"}
            </button>
          </div>
        </div>

        {/* Bottom shadow line */}
        <div className="h-3 bg-gradient-to-b from-transparent to-black/5" />
      </div>
    </div>
  );
}
