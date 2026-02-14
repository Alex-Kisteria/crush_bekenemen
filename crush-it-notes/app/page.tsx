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
const MAX_OVERLAP_AREA_FRACTION = 0.35;

type CanvasSize = { width: number; height: number };
type RectPx = { left: number; top: number; right: number; bottom: number };
type NotePatch = Partial<
  Pick<Note, "author" | "to" | "content" | "color" | "x" | "y" | "rotation">
>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rectsOverlapMoreThan(a: RectPx, b: RectPx, maxOverlapPx: number) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return overlapX > maxOverlapPx && overlapY > maxOverlapPx;
}

function rectsOverlapAreaMoreThanFraction(
  a: RectPx,
  b: RectPx,
  maxFraction: number,
) {
  const overlapX = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
  );
  const overlapY = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  );
  const overlapArea = overlapX * overlapY;

  const noteArea = NOTE_W * NOTE_H;
  return overlapArea > noteArea * maxFraction;
}

function noteToRectPx(note: Note): RectPx {
  const left = note.x;
  const top = note.y;
  return { left, top, right: left + NOTE_W, bottom: top + NOTE_H };
}

function candidateToRectPx(xPx: number, yPx: number): RectPx {
  return { left: xPx, top: yPx, right: xPx + NOTE_W, bottom: yPx + NOTE_H };
}

function findNonOverlappingPositionPx(
  existingNotes: Note[],
  start: { x: number; y: number },
): { xPx: number; yPx: number } {
  const existingRects = existingNotes.map(noteToRectPx);

  const fits = (xPx: number, yPx: number) => {
    const rect = candidateToRectPx(xPx, yPx);
    return !existingRects.some((r) =>
      rectsOverlapAreaMoreThanFraction(rect, r, MAX_OVERLAP_AREA_FRACTION),
    );
  };

  const STEP = 28;
  const MAX_R = 2500; // search radius around start (increase if you want)
  const sx = start.x;
  const sy = start.y;

  if (fits(sx, sy)) return { xPx: sx, yPx: sy };

  for (let r = STEP; r <= MAX_R; r += STEP) {
    for (let k = 0; k < 16; k++) {
      const angle = (Math.PI * 2 * k) / 16;
      const x = sx + r * Math.cos(angle);
      const y = sy + r * Math.sin(angle);
      if (fits(x, y)) return { xPx: x, yPx: y };
    }
  }

  // fallback
  return { xPx: sx, yPx: sy };
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

  // Tracks latest server updated_at we've applied per note (prevents out-of-order realtime jitter)
  const lastServerUpdatedAtRef = useRef<Record<string, number>>({});

  // Tracks when we last moved a note locally (during drag). Used to temporarily ignore realtime updates.
  const lastLocalMoveAtRef = useRef<Record<string, number>>({});

  const ownedNoteIds = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) {
      if (getEditToken(n.id)) s.add(n.id);
    }
    return s;
  }, [notes]);

  const visibleNoteIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return new Set(filteredNotes.map((n) => n.id));
  }, [filteredNotes, searchQuery]);

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
  const dragOffsetWorldRef = useRef({ x: 0, y: 0 });

  const dragStartMouseRef = useRef<{ x: number; y: number } | null>(null);
  const didDragMoveRef = useRef(false);
  const lastDragRef = useRef<{ id: string | null; at: number }>({
    id: null,
    at: 0,
  });

  // Zoom
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2.2;
  const ZOOM_STEP = 0.1;

  // Pan (screen px relative to viewport top-left)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [baseSize, setBaseSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // For initializing pan once
  const didInitPanRef = useRef(false);

  const getViewportSize = () => {
    const vp = viewportRef.current;
    return { w: vp?.clientWidth ?? 0, h: vp?.clientHeight ?? 0 };
  };

  const screenToWorld = (clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: 0, y: 0 };

    const r = vp.getBoundingClientRect();
    const sx = clientX - r.left; // screen coords inside viewport
    const sy = clientY - r.top;

    const p = panRef.current;
    return {
      x: (sx - p.x) / zoom,
      y: (sy - p.y) / zoom,
    };
  };

  const worldToScreenLocal = (worldX: number, worldY: number) => {
    const p = panRef.current;
    return {
      x: worldX * zoom + p.x,
      y: worldY * zoom + p.y,
    };
  };

  useLayoutEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      if (!vp) return;

      const r = vp.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);

      // init pan so world origin is centered in viewport
      if (!didInitPanRef.current && w > 0 && h > 0) {
        setPan({ x: w / 2, y: h / 2 });
        didInitPanRef.current = true;
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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

        const ui = (data.notes ?? []).map(apiToUi);

        // Initialize server timestamp map from initial load
        const map: Record<string, number> = {};
        for (const n of data.notes ?? []) {
          const t = Date.parse((n.updated_at ?? n.created_at ?? "") as string);
          if (Number.isFinite(t)) map[n.id] = t;
        }
        lastServerUpdatedAtRef.current = map;

        setNotes(ui);
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

            // record latest server timestamp
            const t = Date.parse(
              (row.updated_at ?? row.created_at ?? "") as string,
            );
            if (Number.isFinite(t)) {
              const prev = lastServerUpdatedAtRef.current[row.id] ?? 0;
              if (t > prev) lastServerUpdatedAtRef.current[row.id] = t;
            }

            setNotes((prev) =>
              prev.some((n) => n.id === row.id)
                ? prev
                : [...prev, apiToUi(row)],
            );
            return;
          }

          if (evt === "UPDATE") {
            const row = payload.new as any as ApiNote;

            // 1) Prevent jitter while we're dragging locally.
            if (draggedNoteRef.current === row.id) return;

            // 2) Cooldown: ignore server updates briefly after local move.
            // This reduces "snap back" when realtime delivers slightly delayed updates.
            const lastLocal = lastLocalMoveAtRef.current[row.id] ?? 0;
            if (lastLocal && Date.now() - lastLocal < 450) return;

            // 3) Timestamp ordering: ignore out-of-order realtime updates.
            const incomingT = Date.parse(
              (row.updated_at ?? row.created_at ?? "") as string,
            );
            const prevT = lastServerUpdatedAtRef.current[row.id] ?? 0;

            if (Number.isFinite(incomingT)) {
              if (incomingT < prevT) return;
              lastServerUpdatedAtRef.current[row.id] = incomingT;
            }

            setNotes((prev) =>
              prev.map((n) => (n.id === row.id ? apiToUi(row) : n)),
            );
            return;
          }

          if (evt === "DELETE") {
            const row = payload.old as any as { id: string };
            // cleanup timestamp maps
            delete lastServerUpdatedAtRef.current[row.id];
            delete lastLocalMoveAtRef.current[row.id];

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
      if (!token) return; // only owners can persist moves

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
      // Panning
      if (isPanningRef.current && !draggedNoteRef.current) {
        const s = panStartRef.current;
        if (!s) return;
        setPan({ x: s.x + (e.clientX - s.cx), y: s.y + (e.clientY - s.cy) });
        return;
      }

      // Dragging a note
      const id = draggedNoteRef.current;
      if (!id) return;

      if (!getEditToken(id)) return;

      const p = screenToWorld(e.clientX, e.clientY);
      const off = dragOffsetWorldRef.current;

      const newX = p.x - off.x;
      const newY = p.y - off.y;

      // mark local movement time (used to suppress jittery realtime UPDATEs)
      lastLocalMoveAtRef.current[id] = Date.now();

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
      isPanningRef.current = false;
      panStartRef.current = null;

      const id = draggedNoteRef.current;
      if (!id) return;

      draggedNoteRef.current = null;
      setDraggedNote(null);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flush();

      // Snap to nearest non-overlapping position (prevents "covering")
      const { x, y } = lastPosRef.current;
      const others = notesRef.current.filter((n) => n.id !== id);
      const snapped = findNonOverlappingPositionPx(others, { x, y });

      // mark local movement time again for cooldown right after drop
      lastLocalMoveAtRef.current[id] = Date.now();

      if (snapped.xPx !== x || snapped.yPx !== y) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, x: snapped.xPx, y: snapped.yPx } : n,
          ),
        );
        await sendPosition(id, snapped.xPx, snapped.yPx);
      } else {
        await sendPosition(id, x, y);
      }

      // Prevent accidental open right after drag
      lastDragRef.current = { id, at: Date.now() };
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [zoom]);

  const keepViewCenteredWhileZooming = (nextZoom: number) => {
    const { w, h } = getViewportSize();
    if (!w || !h) return;

    const p = panRef.current;

    // world coord at viewport center before zoom
    const centerWorldX = (w / 2 - p.x) / zoom;
    const centerWorldY = (h / 2 - p.y) / zoom;

    setZoom(nextZoom);

    // choose pan so the same world center stays at viewport center
    setPan({
      x: w / 2 - centerWorldX * nextZoom,
      y: h / 2 - centerWorldY * nextZoom,
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

  // Panning drag
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
  } | null>(null);

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // start panning only when clicking empty background
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return;

    isPanningRef.current = true;
    panStartRef.current = {
      x: panRef.current.x,
      y: panRef.current.y,
      cx: e.clientX,
      cy: e.clientY,
    };
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

    const { w, h } = getViewportSize();
    const centerWorld = {
      x: (w / 2 - panRef.current.x) / zoom,
      y: (h / 2 - panRef.current.y) / zoom,
    };

    const placement = findNonOverlappingPositionPx(notesRef.current, {
      x: centerWorld.x - NOTE_W / 2,
      y: centerWorld.y - NOTE_H / 2,
    });

    const x = placement.xPx;
    const y = placement.yPx;
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

      if (!res.ok) throw new Error(await res.text().catch(() => "POST failed"));
      const data = (await res.json()) as { note: ApiNote; editToken: string };

      if (data.editToken) setEditToken(id, data.editToken);
      setIsCreateOpen(false);

      setNotes((prev) =>
        prev.some((n) => n.id === data.note.id)
          ? prev
          : [...prev, apiToUi(data.note)],
      );

      // Keep burst API as % by converting world->screen->%
      const local = worldToScreenLocal(x, y);
      if (w > 0 && h > 0) {
        setBurst({
          xPct: (local.x / w) * 100,
          yPct: (local.y / h) * 100,
          key: Date.now(),
        });
        setTimeout(() => setBurst(null), 800);
      }
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
    const note = notesRef.current.find((n) => n.id === noteId);
    if (!note) return;

    const p = screenToWorld(e.clientX, e.clientY);
    dragOffsetWorldRef.current = { x: p.x - note.x, y: p.y - note.y };

    draggedNoteRef.current = noteId;
    setDraggedNote(noteId);
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

  // Visible viewport size (same measurement basis as worldW/worldH)
  const viewW = worldW;
  const viewH = worldH;

  // Scroll area should grow when zoom > 1, but should NOT shrink when zoom < 1
  const scrollW = worldW * Math.max(zoom, 1);
  const scrollH = worldH * Math.max(zoom, 1);

  // Center the scaled world inside the viewport when zoomed out
  const offsetX = zoom < 1 ? Math.max(0, (viewW - worldW * zoom) / 2) : 0;
  const offsetY = zoom < 1 ? Math.max(0, (viewH - worldH * zoom) / 2) : 0;

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

        {/* Viewport (captures panning) */}
        <div
          ref={viewportRef}
          className="absolute inset-0 overflow-hidden z-20"
          onMouseDown={handleViewportMouseDown}
        >
          {/* World layer */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            <NoteHeartsBurst burst={burst} />

            <Canvas
              ref={canvasRef}
              notes={notes}
              ownedNoteIds={ownedNoteIds}
              visibleNoteIds={visibleNoteIds}
              onMouseMove={() => {}}
              onMouseUp={() => {}}
              onMouseDown={handleMouseDown}
              onDeleteNote={deleteNote}
              onOpenNote={handleOpenNote}
            />
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
      </div>
    </>
  );
}
