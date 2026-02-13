"use client";

import { Note } from "@/types/note";
import { useEffect, useRef, useState } from "react";

interface StickyNoteProps {
  note: Note;
  isOwner: boolean;
  onMouseDown: (e: React.MouseEvent, noteId: string) => void;
  onDelete: (noteId: string) => void;
  onOpen: (noteId: string) => void;
}

export default function StickyNote({
  note,
  isOwner,
  onMouseDown,
  onDelete,
  onOpen,
}: StickyNoteProps) {
  const authorLabel = note.author.trim() ? note.author.trim() : "Anonymous";
  const toLabel = note.to.trim();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [pluck, setPluck] = useState(false);
  const pluckTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pluckTimerRef.current) window.clearTimeout(pluckTimerRef.current);
    };
  }, []);

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
  }, []);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      try {
        await a.play();
      } catch {
        // ignore
      }
    } else {
      a.pause();
    }
  };

  const hasSong = !!note.trackId;

  const isInteractiveTarget = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    return !!el?.closest("button,a,input,textarea,select");
  };

  const doPluck = () => {
    setPluck(true);
    if (pluckTimerRef.current) window.clearTimeout(pluckTimerRef.current);
    pluckTimerRef.current = window.setTimeout(() => setPluck(false), 160);
  };

  return (
    <div
      className={[
        "absolute w-[240px] h-[200px] p-4 shadow-lg transition-shadow hover:shadow-2xl group rounded-xl",
        "transition-transform duration-150 ease-out",
        isOwner ? "cursor-move" : "cursor-pointer",
      ].join(" ")}
      style={{
        left: `${note.x}%`,
        top: `${note.y}%`,
        backgroundColor: note.color,
        transform: `rotate(${note.rotation}deg) scale(${pluck ? 1.06 : 1})`,
        willChange: "transform",
      }}
      onMouseDown={(e) => {
        // Only owners can drag. Also: don't start drag from interactive controls.
        if (!isOwner) return;
        if (isInteractiveTarget(e.target)) return;

        e.preventDefault();
        onMouseDown(e, note.id);
      }}
      onClick={(e) => {
        if (isInteractiveTarget(e.target)) return;
        doPluck();
        onOpen(note.id);
      }}
    >
      {isOwner && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-400 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-rose-500"
          title="Delete note"
        >
          ×
        </button>
      )}

      <div className="h-full flex flex-col gap-2">
        <div className="text-gray-800 text-xs font-note leading-tight">
          <div className="truncate">
            <span className="opacity-70">From:</span> {authorLabel}
          </div>
          <div className="truncate">
            <span className="opacity-70">To:</span> {toLabel || "—"}
          </div>
        </div>

        <div className="text-gray-800 text-sm whitespace-pre-wrap break-words overflow-auto font-note flex-1">
          {note.content}
        </div>

        {hasSong && (
          <div className="mt-1 pt-2 border-t border-black/10">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-rose-900 truncate">
                  {note.trackName ?? "Song"}
                </div>
                <div className="text-[11px] text-rose-800/70 truncate">
                  {note.trackArtists ?? ""}
                </div>
              </div>

              {note.trackPreviewUrl ? (
                <>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      void togglePlay();
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] bg-white/70 border border-rose-600/20 hover:bg-rose-50"
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <audio
                    ref={audioRef}
                    src={note.trackPreviewUrl}
                    preload="none"
                  />
                </>
              ) : (
                <div className="text-[11px] text-rose-800/60">No preview</div>
              )}

              {note.trackSpotifyUrl && (
                <a
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  href={note.trackSpotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded-lg text-[11px] bg-white/70 border border-rose-600/20 hover:bg-rose-50"
                >
                  Open
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
