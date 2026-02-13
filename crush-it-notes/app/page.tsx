"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Canvas from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import ZoomControls from "@/components/Zoomcontrols";
import ShareButton from "@/components/ShareButton";
import FallingHeartsBackground from "@/components/FallingHeartsBackground";
import NoteHeartsBurst, { NoteBurst } from "@/components/NotesHeartsBurst";
import MusicPlaySection from "@/components/MusicPlaySection";
import { Note } from "@/types/note";
import {
  getEditToken,
  removeEditToken,
  setEditToken,
} from "@/lib/noteEditTokens";

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
    created_at: n.created_at,
    updated_at: n.updated_at,
  };
}

export default function ValentinesNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const notesRef = useRef<Note[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  const postingRef = useRef<Set<string>>(new Set());
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const draggedNoteRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [burst, setBurst] = useState<NoteBurst>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
  const [pendingCreate, setPendingCreate] = useState(false);

  // Zoom
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.1;

  const viewportRef = useRef<HTMLDivElement>(null);
  const [baseSize, setBaseSize] = useState<CanvasSize>({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

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

  // useLayoutEffect(() => {
  //   const el = viewportRef.current;
  //   if (!el) return;

  //   const set = () =>
  //     setBaseSize({ width: el.clientWidth, height: el.clientHeight });

  //   set();

  //   const ro = new ResizeObserver(() => set());
  //   ro.observe(el);

  //   window.addEventListener("resize", set);
  //   return () => {
  //     ro.disconnect();
  //     window.removeEventListener("resize", set);
  //   };
  // }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const id = draggedNoteRef.current;
      if (!id || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const off = dragOffsetRef.current;

      const newX = ((e.clientX - off.x - rect.left) / rect.width) * 100;
      const newY = ((e.clientY - off.y - rect.top) / rect.height) * 100;

      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, x: clamp(newX, 0, 95), y: clamp(newY, 0, 95) }
            : n,
        ),
      );
    };

    const onUp = async () => {
      const id = draggedNoteRef.current;
      if (!id) return;

      draggedNoteRef.current = null;
      setDraggedNote(null);

      const token = getEditToken(id);
      if (!token) return;

      const n = notesRef.current.find((x) => x.id === id);
      if (!n) return;

      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editToken: token,
            patch: { x: n.x, y: n.y },
          }),
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`PATCH failed (${res.status}): ${msg}`);
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
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
    if (editingNoteId) return;
    setPendingCreate(true);
    setIsColorPickerOpen(true);
  };

  const createNoteWithColor = (color: string) => {
    const id = crypto.randomUUID();

    // Create ownership token immediately (so POST can be safely retried)
    const editToken = crypto.randomUUID();
    setEditToken(id, editToken);

    const canvasSize = getCanvasSize();
    const placement = findNonOverlappingPositionPx(
      notesRef.current,
      canvasSize,
    );

    const x = (placement.xPx / canvasSize.width) * 100;
    const y = (placement.yPx / canvasSize.height) * 100;

    const newNote: Note = {
      id,
      author: "",
      to: "",
      content: "",
      color,
      x: clamp(x, 0, 95),
      y: clamp(y, 0, 95),
      rotation: Math.random() * 10 - 5,
    };

    setNotes((prev) => [...prev, newNote]);
    setEditingNoteId(id);
  };

  const updateNoteContent = (noteId: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content } : n)),
    );
  };

  const deleteNote = async (noteId: string) => {
    const token = getEditToken(noteId);
    if (!token) {
      alert("You can only delete notes you posted on this device/browser.");
      return;
    }

    // optimistic UI
    const prev = notesRef.current;
    setNotes((p) => p.filter((n) => n.id !== noteId));
    if (editingNoteId === noteId) setEditingNoteId(null);

    try {
      const res = await fetch(
        `/api/notes/${noteId}?editToken=${encodeURIComponent(token)}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`DELETE failed (${res.status}): ${msg}`);
      }

      removeEditToken(noteId);
    } catch (e) {
      console.error(e);
      // rollback if server rejected
      setNotes(prev);
    }
  };

  const finishEdit = async (noteId: string) => {
    if (postingRef.current.has(noteId)) return; // prevent double-click duplicates

    const note = notesRef.current.find((n) => n.id === noteId);
    if (!note) return;

    if (!note.content.trim()) {
      // discard local-only note
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (editingNoteId === noteId) setEditingNoteId(null);
      removeEditToken(noteId);
      return;
    }

    const editToken = getEditToken(noteId);
    if (!editToken) {
      alert("Missing edit token. Please create a new note again.");
      return;
    }

    postingRef.current.add(noteId);

    try {
      // POST creates note and returns editToken
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          editToken, // <-- important

          author: note.author,
          to_name: note.to,
          content: note.content,
          color: note.color,
          x: note.x,
          y: note.y,
          rotation: note.rotation,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`POST /api/notes failed (${res.status}): ${msg}`);
      }

      const data = (await res.json()) as { note: ApiNote; editToken: string };

      // Keep token (server returns the same one if duplicate+match)
      if (data.editToken) setEditToken(note.id, data.editToken);

      // Replace local note with canonical server note
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? apiToUi(data.note) : n)),
      );

      setEditingNoteId(null);

      setBurst({ xPct: note.x, yPct: note.y, key: Date.now() });
      setTimeout(() => setBurst(null), 800);
    } catch (e) {
      console.error(e);
      alert("Failed to post note. Please try again.");
    } finally {
      postingRef.current.delete(noteId);
    }
  };

  const cancelEdit = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (editingNoteId === noteId) setEditingNoteId(null);
  };

  const selectColor = (color: string) => {
    setSelectedColor(color);

    if (pendingCreate) {
      createNoteWithColor(color);
      setPendingCreate(false);
      setIsColorPickerOpen(false);
      return;
    }

    if (editingNoteId) {
      setNotes((prev) =>
        prev.map((n) => (n.id === editingNoteId ? { ...n, color } : n)),
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    if (editingNoteId === noteId) return;

    const token = getEditToken(noteId);
    if (!token) {
      // not draggable if you don't own it
      return;
    }

    const note = notesRef.current.find((n) => n.id === noteId);
    if (!note || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const noteX = (note.x / 100) * rect.width;
    const noteY = (note.y / 100) * rect.height;

    const offset = { x: e.clientX - noteX, y: e.clientY - noteY };

    setDragOffset(offset);
    dragOffsetRef.current = offset;

    setDraggedNote(noteId);
    draggedNoteRef.current = noteId;
  };

  const handleMouseMove = (_e: React.MouseEvent) => {};
  const handleMouseUp = () => {
    draggedNoteRef.current = null;
    setDraggedNote(null);
  };

  const worldW = baseSize.width > 0 ? baseSize.width : getCanvasSize().width;
  const worldH = baseSize.height > 0 ? baseSize.height : getCanvasSize().height;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
      <Header />

      <FallingHeartsBackground />

      {/* Scrollable zoom viewport (scrollbars appear when zoom > 1) */}
      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-auto z-20"
        style={{
          // prevents layout shift when scrollbars appear/disappear
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
              notes={notes}
              editingNoteId={editingNoteId}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseDown={handleMouseDown}
              onDeleteNote={deleteNote}
              onUpdateNote={updateNote}
              onFinishEdit={finishEdit}
              onCancelEdit={cancelEdit}
            />
          </div>
        </div>
      </div>

      <Toolbar
        onAddNote={addNote}
        colors={PASTEL_COLORS}
        selectedColor={selectedColor}
        isColorPickerOpen={isColorPickerOpen}
        onSelectColor={selectColor}
        onCloseColorPicker={() => {
          setIsColorPickerOpen(false);
          setPendingCreate(false);
        }}
      />

      <ZoomControls
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={zoomReset}
      />

      <MusicPlaySection />
    </div>
  );
}
