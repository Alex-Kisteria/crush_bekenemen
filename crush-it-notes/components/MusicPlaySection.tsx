"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Track = {
  id: string;
  name: string;
  artists: string;
  album: string;
  image: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
  durationMs: number;
};

function msToMmSs(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function MusicPlaySection() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playErr, setPlayErr] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canSearch = query.trim().length >= 2;

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentId) ?? null,
    [tracks, currentId],
  );

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      // MediaError codes are not super friendly; provide a generic message
      setPlayErr("Could not play preview audio for this track.");
      setIsPlaying(false);
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  const doSearch = async () => {
    if (!canSearch) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(
        `/api/spotify/search?query=${encodeURIComponent(query.trim())}`,
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Search failed (${res.status}) ${txt}`);
      }

      const data = (await res.json()) as { tracks: Track[] };
      setTracks(data.tracks ?? []);

      // Optional: auto-select first result
      if ((data.tracks?.length ?? 0) > 0) {
        setCurrentId(data.tracks[0].id);
      }
    } catch (e: any) {
      setErr(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (t: Track) => {
    setPlayErr(null);
    setCurrentId(t.id);

    // If no preview is available, we can't play via <audio>.
    // The embedded player below will still work for many tracks.
    if (!t.previewUrl) {
      setPlayErr(
        "No preview audio available. Use the embedded player or Open in Spotify.",
      );
      return;
    }

    const a = audioRef.current;
    if (!a) return;

    // Toggle if same track
    if (currentId === t.id && !a.paused) {
      a.pause();
      return;
    }

    // Force reload of the new src for better browser compatibility
    a.pause();
    a.currentTime = 0;
    a.muted = false;
    a.volume = 1;

    a.src = t.previewUrl;
    a.load();

    try {
      await a.play();
    } catch {
      setPlayErr(
        "Playback was blocked by the browser. Click Play again or use the embedded player.",
      );
    }
  };

  const stop = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setIsPlaying(false);
  };

  return (
    <div className="absolute top-6 bottom-6 right-8 z-50 pointer-events-auto max-h-screen">
      <div
        className="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-rose-600/20 
                w-[420px] overflow-auto max-h-[calc(100vh-3rem)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-rose-600/10">
          <div className="font-semibold text-rose-700">Music</div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>

        {open && (
          <div className="p-4">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                placeholder="Search songs (e.g., 'Lover Taylor Swift')"
                className="flex-1 px-3 py-2 rounded-xl border border-rose-600/20 outline-none focus:border-rose-400 bg-white"
              />
              <button
                type="button"
                onClick={doSearch}
                disabled={!canSearch || loading}
                className="px-4 py-2 rounded-xl bg-pink-500 text-white font-semibold disabled:opacity-50"
              >
                {loading ? "..." : "Search"}
              </button>
            </div>

            {err && <div className="mt-2 text-sm text-rose-700">{err}</div>}

            {/* Now Playing */}
            <div className="mt-4 rounded-xl border border-rose-600/10 p-3 bg-rose-50/40">
              <div className="text-xs font-semibold text-rose-700 mb-2">
                Selected
              </div>

              {currentTrack ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-rose-600/10 flex items-center justify-center">
                      {currentTrack.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentTrack.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-rose-700/60">No img</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-rose-900 truncate">
                        {currentTrack.name}
                      </div>
                      <div className="text-xs text-rose-800/70 truncate">
                        {currentTrack.artists} •{" "}
                        {msToMmSs(currentTrack.durationMs)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playTrack(currentTrack)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-white border border-rose-600/20 hover:bg-rose-50"
                        title={
                          !currentTrack.previewUrl
                            ? "No preview audio. Use embedded player or Open."
                            : undefined
                        }
                      >
                        {isPlaying && currentId === currentTrack.id
                          ? "Pause"
                          : "Play"}
                      </button>

                      <button
                        type="button"
                        onClick={stop}
                        className="px-3 py-1.5 rounded-lg text-xs bg-white border border-rose-600/20 hover:bg-rose-50"
                      >
                        Stop
                      </button>
                    </div>
                  </div>

                  {playErr && (
                    <div className="mt-2 text-xs text-rose-700">{playErr}</div>
                  )}

                  {/* Always-available Spotify Embed (works even when preview_url is null) */}
                  <div className="mt-3">
                    <iframe
                      title="Spotify Player"
                      src={`https://open.spotify.com/embed/track/${currentTrack.id}`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      style={{ borderRadius: 12 }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-rose-800/70">
                  Search and select a track.
                </div>
              )}

              <audio ref={audioRef} className="hidden" />
            </div>

            {/* Results */}
            {/* <div className="mt-4 max-h-[240px] overflow-auto pr-1">
              {tracks.length === 0 && !loading ? (
                <div className="text-sm text-rose-800/70">No results yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tracks.map((t) => {
                    const active = t.id === currentId;

                    return (
                      <div
                        key={t.id}
                        className={[
                          "flex items-center gap-3 p-2 rounded-xl border",
                          active
                            ? "border-rose-400 bg-rose-50/50"
                            : "border-rose-600/10 bg-white",
                        ].join(" ")}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-rose-50 border border-rose-600/10 flex items-center justify-center">
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
                            {t.artists} • {msToMmSs(t.durationMs)}
                            {!t.previewUrl ? " • No preview_url" : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playTrack(t)}
                            className="px-3 py-1.5 rounded-lg text-xs bg-white border border-rose-600/20 hover:bg-rose-50"
                          >
                            {active && isPlaying ? "Pause" : "Play"}
                          </button>

                          <a
                            href={t.spotifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs bg-white border border-rose-600/20 hover:bg-rose-50"
                            title="Open in Spotify"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div> */}

            {/* <div className="mt-3 text-[11px] text-rose-800/60">
              Note: Some tracks don’t provide <code>preview_url</code>. The
              embedded player is the fallback.
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}
