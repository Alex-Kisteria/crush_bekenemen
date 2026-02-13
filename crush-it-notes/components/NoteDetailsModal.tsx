"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "@/types/note";

interface NoteDetailsModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
}

export default function NoteDetailsModal({
  isOpen,
  note,
  onClose,
}: NoteDetailsModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const authorLabel = useMemo(() => {
    const a = (note?.author ?? "").trim();
    return a ? a : "Anonymous";
  }, [note?.author]);

  const toLabel = useMemo(() => {
    const t = (note?.to ?? "").trim();
    return t ? t : "—";
  }, [note?.to]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [note?.trackPreviewUrl]);

  useEffect(() => {
    // Stop preview when closing / switching notes
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setIsPlaying(false);
  }, [isOpen, note?.id]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      try {
        await a.play();
      } catch {
        // ignore autoplay errors
      }
    } else {
      a.pause();
    }
  };

  if (!isOpen || !note) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/5 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl border border-rose-100 overflow-hidden bg-white"
        style={{ outline: "none" }}
      >
        <div
          className="px-6 py-4 flex items-start justify-between gap-3"
          style={{ backgroundColor: note.color }}
        >
          <div className="min-w-0">
            <div className="text-rose-900/80 text-sm">
              <span className="font-semibold">From:</span> {authorLabel}{" "}
              <span className="mx-2">•</span>
              <span className="font-semibold">To:</span> {toLabel}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="text-rose-950 font-semibold mb-2">Message</div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 max-h-[40vh] overflow-auto whitespace-pre-wrap break-words text-rose-950">
            {note.content}
          </div>

          {(note.trackId || note.trackPreviewUrl || note.trackSpotifyUrl) && (
            <div className="mt-6">
              <div className="text-rose-950 font-semibold mb-2">Song</div>

              <div className="rounded-2xl border border-rose-100 bg-white p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  {note.trackImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={note.trackImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-rose-700/60">No img</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-rose-950 font-semibold truncate">
                    {note.trackName ?? "Song"}
                  </div>
                  <div className="text-rose-900/70 text-sm truncate">
                    {note.trackArtists ?? ""}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {note.trackPreviewUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
                        >
                          {isPlaying ? "Pause" : "Play"} preview
                        </button>

                        <audio
                          ref={audioRef}
                          src={note.trackPreviewUrl}
                          preload="none"
                        />
                      </>
                    ) : (
                      <div className="text-sm text-rose-900/70">
                        No preview available
                      </div>
                    )}

                    {note.trackSpotifyUrl && (
                      <a
                        href={note.trackSpotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-900 text-sm hover:bg-rose-50"
                      >
                        Open in Spotify
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
