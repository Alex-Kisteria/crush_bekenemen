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
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const authorLabel = useMemo(() => {
    const a = (note?.author ?? "").trim();
    return a ? a : "Anonymous";
  }, [note?.author]);

  const toLabel = useMemo(() => {
    const t = (note?.to ?? "").trim();
    return t ? t : "—";
  }, [note?.to]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Delay content animation slightly after modal entrance
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  const stop = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setIsPlaying(false);
  };

  if (!isAnimating && !isOpen) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-[60] flex items-center justify-center p-4",
        "transition-all duration-400 ease-out",
        isOpen
          ? "bg-black/5 backdrop-blur-xs"
          : "bg-black/0 backdrop-blur-none pointer-events-none",
      ].join(" ")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={[
          "w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden",
          "transition-all duration-500",
          isAnimating && isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95",
        ].join(" ")}
        style={{
          backgroundColor: note?.color ?? "#FFE5E5",
          outline: "none",
          transform:
            isAnimating && isOpen
              ? `rotate(${(note?.rotation ?? 0) * 0.3}deg)`
              : `rotate(${(note?.rotation ?? 0) * 0.3 - 2}deg) scale(0.95) translateY(20px)`,
          transitionTimingFunction: isOpen
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "cubic-bezier(0.4, 0, 1, 1)",
        }}
      >
        {/* Sticky note header with tape effect */}
        <div className="relative px-6 pt-6 pb-4">
          <div
            className={[
              "absolute top-0 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/30 rounded-b-lg border-t-2 border-white/50",
              "transition-all duration-500",
              showContent
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-3",
            ].join(" ")}
            style={{
              transitionDelay: showContent ? "200ms" : "0ms",
            }}
          />

          <button
            type="button"
            onClick={onClose}
            className={[
              "absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-400/80 text-white flex items-center justify-center hover:bg-rose-500 transition-all shadow-md z-10",
              "duration-400",
              showContent
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-0 rotate-180",
            ].join(" ")}
            style={{
              transitionDelay: showContent ? "300ms" : "0ms",
            }}
            title="Close"
          >
            ×
          </button>

          <div
            className={[
              "text-gray-800 font-note text-sm leading-tight pt-4",
              "transition-all duration-500",
              showContent
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-6",
            ].join(" ")}
            style={{
              transitionDelay: showContent ? "150ms" : "0ms",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="opacity-70 font-semibold">From:</span>
              <span className="font-semibold">{authorLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-70 font-semibold">To:</span>
              <span className="font-semibold">{toLabel}</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Message content */}
          <div
            className={[
              "bg-white/40 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-black/5 shadow-inner",
              "transition-all duration-500",
              showContent
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-6 scale-95",
            ].join(" ")}
            style={{
              transitionDelay: showContent ? "250ms" : "0ms",
            }}
          >
            <div className="text-gray-800 font-note text-base whitespace-pre-wrap break-words max-h-[250px] overflow-auto">
              {note?.content}
            </div>
          </div>

          {/* Song section */}
          {(note?.trackId ||
            note?.trackPreviewUrl ||
            note?.trackSpotifyUrl) && (
            <div
              className={[
                "bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-black/5 shadow-inner",
                "transition-all duration-500",
                showContent
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-8 scale-95",
              ].join(" ")}
              style={{
                transitionDelay: showContent ? "350ms" : "0ms",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={[
                    "w-14 h-14 rounded-xl overflow-hidden bg-white border border-rose-100 flex items-center justify-center shrink-0 shadow-md",
                    "transition-all duration-600",
                    showContent
                      ? "opacity-100 scale-100 rotate-0"
                      : "opacity-0 scale-50 -rotate-45",
                  ].join(" ")}
                  style={{
                    transitionDelay: showContent ? "450ms" : "0ms",
                  }}
                >
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
                  <div className="text-rose-950 font-semibold text-sm truncate">
                    {note.trackName ?? "Song"}
                  </div>
                  <div className="text-rose-900/70 text-xs truncate">
                    {note.trackArtists ?? ""}
                  </div>
                </div>

                <div
                  className={[
                    "flex items-center gap-2",
                    "transition-all duration-500",
                    showContent
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-8",
                  ].join(" ")}
                  style={{
                    transitionDelay: showContent ? "500ms" : "0ms",
                  }}
                >
                  {note.trackPreviewUrl && (
                    <>
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-md"
                      >
                        {isPlaying ? "Pause" : "Play"}
                      </button>

                      <button
                        type="button"
                        onClick={stop}
                        className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-900 text-xs hover:bg-rose-50 transition-colors"
                      >
                        Stop
                      </button>

                      <audio
                        ref={audioRef}
                        src={note.trackPreviewUrl}
                        preload="none"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Spotify Embed */}
              {note.trackId && (
                <div
                  className={[
                    "rounded-xl overflow-hidden shadow-md",
                    "transition-all duration-600",
                    showContent
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90",
                  ].join(" ")}
                  style={{
                    transitionDelay: showContent ? "550ms" : "0ms",
                  }}
                >
                  <iframe
                    title="Spotify Player"
                    src={`https://open.spotify.com/embed/track/${note.trackId}`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    style={{ borderRadius: 12 }}
                  />
                </div>
              )}

              {!note.trackPreviewUrl && (
                <div className="text-xs text-rose-900/70 mt-2">
                  No preview audio available. Use the embedded player above.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Decorative shadow lines at bottom */}
        <div
          className={[
            "h-3 bg-gradient-to-b from-transparent to-black/5",
            "transition-opacity duration-500",
            showContent ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{
            transitionDelay: showContent ? "600ms" : "0ms",
          }}
        />
      </div>
    </div>
  );
}
