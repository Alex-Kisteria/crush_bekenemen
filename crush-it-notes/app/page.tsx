"use client";

import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Canvas from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import ZoomControls from "@/components/Zoomcontrols";
import SearchFilter from "@/components/SearchFilter";
import FallingHeartsBackground from "@/components/FallingHeartsBackground";
import NoteHeartsBurst, { NoteBurst } from "@/components/NotesHeartsBurst";
import CreateNoteModal from "@/components/Createnotemodal";
import NoteDetailsModal from "@/components/NoteDetailsModal";
import ValentinesIntro from "@/components/ValentinesIntro";
import { Note } from "@/types/note";
import {
  getEditToken,
  removeEditToken,
  setEditToken,
} from "@/lib/noteEditTokens";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const PASTEL_COLORS = [
  "#FFB3BA", // Light pink
  "#F95579", // Light peach
  "#FF8AB3", // Light yellow
  // "#BAFFC9", // Light mint
  // "#BAE1FF", // Light blue
  // "#E0BBE4", // Light lavender
  "#FFC4DD", // Light rose
  "#FFE5E5", // Pale pink
];

// Must match StickyNote sizing (w-48 h-48 => 192px if base font-size is 16px)
const NOTE_W = 240;
const NOTE_H = 200;

// Allow up to 2px overlap in BOTH axes; more than that is considered "overlapping too much"
const MAX_OVERLAP_PX = 2;

type RectPx = { left: number; top: number; right: number; bottom: number };
type NotePatch = Partial<
  Pick<Note, "author" | "to" | "content" | "color" | "x" | "y" | "rotation">
>;
type CanvasSize = { width: number; height: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rectsOverlapMoreThan(a: RectPx, b: RectPx, maxOverlapPx: number) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

  // If they overlap by more than maxOverlapPx in BOTH directions,
  // then they overlap too much (area overlap bigger than a thin "stacking" edge).
  return overlapX > maxOverlapPx && overlapY > maxOverlapPx;
}

function noteToRectPx(note: Note, canvas: CanvasSize): RectPx {
  const left = (note.x / 100) * canvas.width;
  const top = (note.y / 100) * canvas.height;
  return {
    left,
    top,
    right: left + NOTE_W,
    bottom: top + NOTE_H,
  };
}

function candidateToRectPx(xPx: number, yPx: number): RectPx {
  return { left: xPx, top: yPx, right: xPx + NOTE_W, bottom: yPx + NOTE_H };
}

function findNonOverlappingPositionPx(
  existingNotes: Note[],
  canvas: CanvasSize,
): { xPx: number; yPx: number } {
  const maxX = canvas.width - NOTE_W;
  const maxY = canvas.height - NOTE_H;

  if (maxX <= 0 || maxY <= 0) return { xPx: 0, yPx: 0 };

  const existingRects = existingNotes.map((n) => noteToRectPx(n, canvas));

  const fits = (xPx: number, yPx: number) => {
    const rect = candidateToRectPx(xPx, yPx);
    return !existingRects.some((r) =>
      rectsOverlapMoreThan(rect, r, MAX_OVERLAP_PX),
    );
  };

  // 1) Try a spiral-ish search around center (feels natural)
  const centerX = clamp(canvas.width / 2 - NOTE_W / 2, 0, maxX);
  const centerY = clamp(canvas.height / 2 - NOTE_H / 2, 0, maxY);

  const STEP = 24;
  const maxR = Math.hypot(canvas.width, canvas.height);

  if (fits(centerX, centerY)) return { xPx: centerX, yPx: centerY };

  for (let r = STEP; r <= maxR; r += STEP) {
    for (let k = 0; k < 8; k++) {
      const angle = (Math.PI * 2 * k) / 8;
      const x = clamp(centerX + r * Math.cos(angle), 0, maxX);
      const y = clamp(centerY + r * Math.sin(angle), 0, maxY);
      if (fits(x, y)) return { xPx: x, yPx: y };
    }
  }

  // 2) Fallback: grid scan (top-left → bottom-right)
  for (let y = 0; y <= maxY; y += STEP) {
    for (let x = 0; x <= maxX; x += STEP) {
      if (fits(x, y)) return { xPx: x, yPx: y };
    }
  }

  return { xPx: centerX, yPx: centerY };
}

type ApiNote = {
  id: string;
  author: string;
  to_name: string;
  content: string;
  color: string;
  x: number;
  y: number;
  rotation: number;

  track_id?: string | null;
  track_name?: string | null;
  track_artists?: string | null;
  track_image?: string | null;
  track_preview_url?: string | null;
  track_spotify_url?: string | null;

  created_at?: string;
  updated_at?: string;
};

function apiToUi(n: ApiNote): Note {
  return {
    id: n.id,
    author: n.author ?? "",
    to: n.to_name ?? "",
    content: n.content ?? "",
    color: n.color,
    x: n.x,
    y: n.y,
    rotation: n.rotation,

    trackId: n.track_id ?? null,
    trackName: n.track_name ?? null,
    trackArtists: n.track_artists ?? null,
    trackImage: n.track_image ?? null,
    trackPreviewUrl: n.track_preview_url ?? null,
    trackSpotifyUrl: n.track_spotify_url ?? null,

    created_at: n.created_at,
    updated_at: n.updated_at,
  };
}

type ModalTrack = {
  id: string;
  name: string;
  artists: string;
  image: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
};

export default function ValentinesNotesPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const notesRef = useRef<Note[]>([]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase().trim();
    return notes.filter((note) => {
      const author = (note.author || "").toLowerCase();
      const to = (note.to || "").toLowerCase();
      return author.includes(query) || to.includes(query);
    });
  }, [notes, searchQuery]);

  const ownedNoteIds = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) {
      if (getEditToken(n.id)) s.add(n.id);
    }
    return s;
  }, [notes]);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );
  const [burst, setBurst] = useState<NoteBurst>(null);

  // Create Note modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftColor, setDraftColor] = useState(PASTEL_COLORS[0]);
  const [draftTrack, setDraftTrack] = useState<ModalTrack | null>(null);

  // Dragging state (unchanged)
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const draggedNoteRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const dragStartMouseRef = useRef<{ x: number; y: number } | null>(null);
  const didDragMoveRef = useRef(false);
  const lastDragRef = useRef<{ id: string | null; at: number }>({
    id: null,
    at: 0,
  });

  // Zoom
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.1;

  const viewportRef = useRef<HTMLDivElement>(null);
  const [baseSize, setBaseSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const getCanvasSize = (): CanvasSize => {
    const vp = viewportRef.current;
    const w = vp?.clientWidth ?? baseSize.width;
    const h = vp?.clientHeight ?? baseSize.height;
    return {
      width: w > 0 ? w : 1000,
      height: h > 0 ? h : 700,
    };
  };

  const measureViewport = () => {
    const el = viewportRef.current;
    if (!el) return;

    // getBoundingClientRect is stable (not tied to scrollbar toggling like clientWidth)
    const r = el.getBoundingClientRect();
    setBaseSize({ width: Math.round(r.width), height: Math.round(r.height) });
  };

  useLayoutEffect(() => {
    measureViewport();

    const onResize = () => measureViewport();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/notes", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/notes failed (${res.status})`);
        const data = (await res.json()) as { notes: ApiNote[] };
        if (cancelled) return;
        setNotes((data.notes ?? []).map(apiToUi));
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("notes-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          const evt = payload.eventType;

          if (evt === "INSERT") {
            const row = payload.new as any as ApiNote;
            setNotes((prev) =>
              prev.some((n) => n.id === row.id)
                ? prev
                : [...prev, apiToUi(row)],
            );
            return;
          }

          if (evt === "UPDATE") {
            const row = payload.new as any as ApiNote;

            // Prevent jitter: don't let realtime overwrite the position while we're dragging locally.
            if (draggedNoteRef.current === row.id) return;

            setNotes((prev) =>
              prev.map((n) => (n.id === row.id ? apiToUi(row) : n)),
            );
            return;
          }

          if (evt === "DELETE") {
            const row = payload.old as any as { id: string };
            setNotes((prev) => prev.filter((n) => n.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const lastSentAtRef = { current: 0 };
    const lastPosRef = { current: { x: 0, y: 0 } };

    let rafId: number | null = null;
    let pending: { id: string; x: number; y: number } | null = null;

    const flush = () => {
      rafId = null;
      if (!pending) return;
      const { id, x, y } = pending;
      pending = null;

      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
    };

    const sendPosition = async (id: string, x: number, y: number) => {
      const token = getEditToken(id);
      if (!token) return;

      try {
        await fetch(`/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editToken: token,
            patch: { x, y },
          }),
        });
      } catch {
        // ignore
      }
    };

    const onMove = (e: MouseEvent) => {
      const id = draggedNoteRef.current;
      if (!id || !canvasRef.current) return;

      // mark as a "real drag" once we exceed a small threshold
      if (!didDragMoveRef.current && dragStartMouseRef.current) {
        const dx = e.clientX - dragStartMouseRef.current.x;
        const dy = e.clientY - dragStartMouseRef.current.y;
        if (Math.hypot(dx, dy) >= 4) didDragMoveRef.current = true;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const off = dragOffsetRef.current;

      const newX = clamp(
        ((e.clientX - off.x - rect.left) / rect.width) * 100,
        0,
        95,
      );
      const newY = clamp(
        ((e.clientY - off.y - rect.top) / rect.height) * 100,
        0,
        95,
      );

      lastPosRef.current = { x: newX, y: newY };

      pending = { id, x: newX, y: newY };
      if (rafId === null) rafId = requestAnimationFrame(flush);

      const now = Date.now();
      if (now - lastSentAtRef.current >= 120) {
        lastSentAtRef.current = now;
        void sendPosition(id, newX, newY);
      }
    };

    const onUp = async () => {
      const id = draggedNoteRef.current;
      if (!id) return;

      draggedNoteRef.current = null;
      setDraggedNote(null);

      if (didDragMoveRef.current) {
        lastDragRef.current = { id, at: Date.now() };
      }

      didDragMoveRef.current = false;
      dragStartMouseRef.current = null;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flush();

      const { x, y } = lastPosRef.current;
      await sendPosition(id, x, y);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const keepViewCenteredWhileZooming = (nextZoom: number) => {
    const vp = viewportRef.current;
    if (!vp) return;

    const vw = vp.clientWidth;
    const vh = vp.clientHeight;

    // current center in "unscaled world pixels"
    const centerX = (vp.scrollLeft + vw / 2) / zoom;
    const centerY = (vp.scrollTop + vh / 2) / zoom;

    // update zoom, then re-center after layout paints
    setZoom(nextZoom);

    requestAnimationFrame(() => {
      vp.scrollLeft = centerX * nextZoom - vw / 2;
      vp.scrollTop = centerY * nextZoom - vh / 2;
    });
  };

  const zoomIn = () =>
    keepViewCenteredWhileZooming(clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  const zoomOut = () =>
    keepViewCenteredWhileZooming(clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  const zoomReset = () => keepViewCenteredWhileZooming(1);

  const updateNote = (noteId: string, patch: NotePatch) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
    );
  };

  const addNote = () => {
    setDraftAuthor("");
    setDraftTo("");
    setDraftContent("");
    setDraftColor(PASTEL_COLORS[0]);
    setDraftTrack(null);
    setIsCreateOpen(true);
  };

  const postFromModal = async () => {
    if (isPosting) return;
    if (!draftContent.trim()) return;

    setIsPosting(true);

    const id = crypto.randomUUID();
    const editToken = crypto.randomUUID();
    setEditToken(id, editToken);

    const canvasSize = getCanvasSize();
    const placement = findNonOverlappingPositionPx(
      notesRef.current,
      canvasSize,
    );
    const x = clamp((placement.xPx / canvasSize.width) * 100, 0, 95);
    const y = clamp((placement.yPx / canvasSize.height) * 100, 0, 95);
    const rotation = Math.random() * 10 - 5;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          editToken,
          author: draftAuthor,
          to_name: draftTo,
          content: draftContent,
          color: draftColor,
          x,
          y,
          rotation,

          track_id: draftTrack?.id ?? null,
          track_name: draftTrack?.name ?? null,
          track_artists: draftTrack?.artists ?? null,
          track_image: draftTrack?.image ?? null,
          track_preview_url: draftTrack?.previewUrl ?? null,
          track_spotify_url: draftTrack?.spotifyUrl ?? null,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`POST /api/notes failed (${res.status}): ${msg}`);
      }

      const data = (await res.json()) as { note: ApiNote; editToken: string };

      // store token (idempotent)
      if (data.editToken) setEditToken(id, data.editToken);

      // close modal
      setIsCreateOpen(false);

      // local update (realtime will also insert; this avoids waiting)
      setNotes((prev) =>
        prev.some((n) => n.id === data.note.id)
          ? prev
          : [...prev, apiToUi(data.note)],
      );

      setBurst({ xPct: x, yPct: y, key: Date.now() });
      setTimeout(() => setBurst(null), 800);
    } catch (e) {
      console.error(e);
      removeEditToken(id);
      alert("Failed to post note. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // const createNoteWithColor = (color: string) => {
  //   const id = crypto.randomUUID();

  //   // Create ownership token immediately (so POST can be safely retried)
  //   const editToken = crypto.randomUUID();
  //   setEditToken(id, editToken);

  //   const canvasSize = getCanvasSize();
  //   const placement = findNonOverlappingPositionPx(
  //     notesRef.current,
  //     canvasSize,
  //   );

  //   const x = (placement.xPx / canvasSize.width) * 100;
  //   const y = (placement.yPx / canvasSize.height) * 100;

  //   const newNote: Note = {
  //     id,
  //     author: "",
  //     to: "",
  //     content: "",
  //     color,
  //     x: clamp(x, 0, 95),
  //     y: clamp(y, 0, 95),
  //     rotation: Math.random() * 10 - 5,
  //   };

  //   setNotes((prev) => [...prev, newNote]);
  //   setEditingNoteId(id);
  // };

  // const updateNoteContent = (noteId: string, content: string) => {
  //   setNotes((prev) =>
  //     prev.map((n) => (n.id === noteId ? { ...n, content } : n)),
  //   );
  // };

  const deleteNote = async (noteId: string) => {
    const token = getEditToken(noteId);
    if (!token) {
      alert("You can only delete notes you posted on this device/browser.");
      return;
    }

    const prev = notesRef.current;
    setNotes((p) => p.filter((n) => n.id !== noteId));

    try {
      const res = await fetch(
        `/api/notes/${noteId}?editToken=${encodeURIComponent(token)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error(`DELETE failed (${res.status})`);
      removeEditToken(noteId);
    } catch (e) {
      console.error(e);
      setNotes(prev);
    }
  };

  // const finishEdit = async (noteId: string) => {
  //   if (postingRef.current.has(noteId)) return;

  //   const note = notesRef.current.find((n) => n.id === noteId);
  //   if (!note) return;

  //   if (!note.content.trim()) {
  //     // discard local-only note
  //     setNotes((prev) => prev.filter((n) => n.id !== noteId));
  //     if (editingNoteId === noteId) setEditingNoteId(null);
  //     removeEditToken(noteId);
  //     return;
  //   }

  //   const editToken = getEditToken(noteId);
  //   if (!editToken) {
  //     alert("Missing edit token. Please create a new note again.");
  //     return;
  //   }

  //   postingRef.current.add(noteId);
  //   setPostingNoteId(noteId);

  //   try {
  //     // POST creates note and returns editToken
  //     const res = await fetch("/api/notes", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         id: note.id,
  //         editToken, // <-- important

  //         author: note.author,
  //         to_name: note.to,
  //         content: note.content,
  //         color: note.color,
  //         x: note.x,
  //         y: note.y,
  //         rotation: note.rotation,
  //       }),
  //     });

  //     if (!res.ok) {
  //       const msg = await res.text().catch(() => "");
  //       throw new Error(`POST /api/notes failed (${res.status}): ${msg}`);
  //     }

  //     const data = (await res.json()) as { note: ApiNote; editToken: string };

  //     // Keep token (server returns the same one if duplicate+match)
  //     if (data.editToken) setEditToken(note.id, data.editToken);

  //     // Replace local note with canonical server note
  //     setNotes((prev) =>
  //       prev.map((n) => (n.id === note.id ? apiToUi(data.note) : n)),
  //     );

  //     setEditingNoteId(null);

  //     setBurst({ xPct: note.x, yPct: note.y, key: Date.now() });
  //     setTimeout(() => setBurst(null), 800);
  //   } catch (e) {
  //     console.error(e);
  //     alert("Failed to post note. Please try again.");
  //   } finally {
  //     postingRef.current.delete(noteId);
  //     setPostingNoteId((current) => (current === noteId ? null : current));
  //   }
  // };

  // const cancelEdit = (noteId: string) => {
  //   setNotes((prev) => prev.filter((n) => n.id !== noteId));
  //   if (editingNoteId === noteId) setEditingNoteId(null);
  // };

  // const selectColor = (color: string) => {
  //   setSelectedColor(color);

  //   if (pendingCreate) {
  //     createNoteWithColor(color);
  //     setPendingCreate(false);
  //     setIsColorPickerOpen(false);
  //     return;
  //   }

  //   if (editingNoteId) {
  //     setNotes((prev) =>
  //       prev.map((n) => (n.id === editingNoteId ? { ...n, color } : n)),
  //     );
  //   }
  // };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    const token = getEditToken(noteId);
    if (!token) return; // only owner can drag

    const note = notesRef.current.find((n) => n.id === noteId);
    if (!note || !canvasRef.current) return;

    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    didDragMoveRef.current = false;

    const rect = canvasRef.current.getBoundingClientRect();
    const noteX = (note.x / 100) * rect.width;
    const noteY = (note.y / 100) * rect.height;

    dragOffsetRef.current = { x: e.clientX - noteX, y: e.clientY - noteY };
    setDraggedNote(noteId);
    draggedNoteRef.current = noteId;
  };

  const handleOpenNote = (noteId: string) => {
    // If we just dragged this note, don't open the modal from the click event.
    const last = lastDragRef.current;
    if (last.id === noteId && Date.now() - last.at < 250) return;

    setSelectedNoteId(noteId);
  };

  const handleMouseMove = (_e: React.MouseEvent) => {};
  const handleMouseUp = () => {
    draggedNoteRef.current = null;
    setDraggedNote(null);
  };

  const worldW = baseSize.width > 0 ? baseSize.width : getCanvasSize().width;
  const worldH = baseSize.height > 0 ? baseSize.height : getCanvasSize().height;

  return (
    <>
      {showIntro && <ValentinesIntro onComplete={() => setShowIntro(false)} />}
      <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
        <Header />

        <SearchFilter
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleClearSearch}
          resultCount={filteredNotes.length}
          totalCount={notes.length}
        />

        <FallingHeartsBackground />

        {/* Scrollable zoom viewport (scrollbars appear when zoom > 1) */}
        <div
          ref={viewportRef}
          className="absolute inset-0 overflow-auto scrollbar-rose z-20"
          style={{
            scrollbarGutter: "stable",
          }}
        >
          <div
            className="relative"
            style={{
              width: `${worldW * zoom}px`,
              height: `${worldH * zoom}px`,
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                width: `${worldW}px`,
                height: `${worldH}px`,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                willChange: "transform",
              }}
            >
              <NoteHeartsBurst burst={burst} />

              <Canvas
                ref={canvasRef}
                notes={filteredNotes}
                ownedNoteIds={ownedNoteIds}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseDown={handleMouseDown}
                onDeleteNote={deleteNote}
                onOpenNote={handleOpenNote}
              />
            </div>
          </div>
        </div>

        <Toolbar onAddNote={addNote} />

        <ZoomControls
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={zoomReset}
        />

        <NoteDetailsModal
          isOpen={!!selectedNoteId}
          note={selectedNote}
          onClose={() => setSelectedNoteId(null)}
        />

        <CreateNoteModal
          isOpen={isCreateOpen}
          isPosting={isPosting}
          author={draftAuthor}
          to={draftTo}
          content={draftContent}
          selectedColor={draftColor}
          colors={PASTEL_COLORS}
          selectedTrack={draftTrack}
          onAuthorChange={setDraftAuthor}
          onToChange={setDraftTo}
          onContentChange={setDraftContent}
          onColorChange={setDraftColor}
          onSelectTrack={setDraftTrack}
          onClose={() => (isPosting ? null : setIsCreateOpen(false))}
          onCreate={postFromModal}
        />

        {/* <MusicPlaySection /> */}
      </div>
    </>
  );
}
