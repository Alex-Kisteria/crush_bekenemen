// "use client";

// import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
// import Header from "@/components/Header";
// import Canvas from "@/components/Canvas";
// import Toolbar from "@/components/Toolbar";
// import ZoomControls from "@/components/Zoomcontrols";
// import SearchFilter from "@/components/SearchFilter";
// import FallingHeartsBackground from "@/components/FallingHeartsBackground";
// import NoteHeartsBurst, { NoteBurst } from "@/components/NotesHeartsBurst";
// import CreateNoteModal from "@/components/Createnotemodal";
// import NoteDetailsModal from "@/components/NoteDetailsModal";
// import ValentinesIntro from "@/components/ValentinesIntro";
// import { Note } from "@/types/note";
// import { getEditToken, removeEditToken, setEditToken } from "@/lib/noteEditTokens";
// import { supabaseBrowser } from "@/lib/supabaseBrowser";

// // ...existing code...

// // NOTE_W/NOTE_H unchanged

// type RectPx = { left: number; top: number; right: number; bottom: number };
// type NotePatch = Partial<Pick<Note, "author" | "to" | "content" | "color" | "x" | "y" | "rotation">>;

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// function rectsOverlapMoreThan(a: RectPx, b: RectPx, maxOverlapPx: number) {
//   const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
//   const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
//   return overlapX > maxOverlapPx && overlapY > maxOverlapPx;
// }

// function noteToRectPx(note: Note): RectPx {
//   const left = note.x;
//   const top = note.y;
//   return { left, top, right: left + NOTE_W, bottom: top + NOTE_H };
// }

// function candidateToRectPx(xPx: number, yPx: number): RectPx {
//   return { left: xPx, top: yPx, right: xPx + NOTE_W, bottom: yPx + NOTE_H };
// }

// // Infinite placement near a starting point (no bounds)
// function findNonOverlappingPositionPx(
//   existingNotes: Note[],
//   start: { x: number; y: number },
// ): { xPx: number; yPx: number } {
//   const existingRects = existingNotes.map(noteToRectPx);

//   const fits = (xPx: number, yPx: number) => {
//     const rect = candidateToRectPx(xPx, yPx);
//     return !existingRects.some((r) => rectsOverlapMoreThan(rect, r, MAX_OVERLAP_PX));
//   };

//   const STEP = 28;
//   const MAX_R = 2500; // search radius around start (increase if you want)
//   const sx = start.x;
//   const sy = start.y;

//   if (fits(sx, sy)) return { xPx: sx, yPx: sy };

//   for (let r = STEP; r <= MAX_R; r += STEP) {
//     for (let k = 0; k < 16; k++) {
//       const angle = (Math.PI * 2 * k) / 16;
//       const x = sx + r * Math.cos(angle);
//       const y = sy + r * Math.sin(angle);
//       if (fits(x, y)) return { xPx: x, yPx: y };
//     }
//   }

//   // fallback
//   return { xPx: sx, yPx: sy };
// }

// // ...existing ApiNote/apiToUi code...

// export default function ValentinesNotesPage() {
//   // ...existing state...

//   // Zoom
//   const [zoom, setZoom] = useState(1);
//   const MIN_ZOOM = 0.4;
//   const MAX_ZOOM = 2.2;
//   const ZOOM_STEP = 0.1;

//   // Pan (screen px relative to viewport top-left)
//   const [pan, setPan] = useState({ x: 0, y: 0 });
//   const panRef = useRef(pan);
//   useEffect(() => {
//     panRef.current = pan;
//   }, [pan]);

//   const viewportRef = useRef<HTMLDivElement>(null);
//   const canvasRef = useRef<HTMLDivElement>(null);

//   // For initializing pan once
//   const didInitPanRef = useRef(false);

//   const getViewportSize = () => {
//     const vp = viewportRef.current;
//     return { w: vp?.clientWidth ?? 0, h: vp?.clientHeight ?? 0 };
//   };

//   const screenToWorld = (clientX: number, clientY: number) => {
//     const vp = viewportRef.current;
//     if (!vp) return { x: 0, y: 0 };

//     const r = vp.getBoundingClientRect();
//     const sx = clientX - r.left; // screen coords inside viewport
//     const sy = clientY - r.top;

//     const p = panRef.current;
//     return {
//       x: (sx - p.x) / zoom,
//       y: (sy - p.y) / zoom,
//     };
//   };

//   const worldToScreenLocal = (worldX: number, worldY: number) => {
//     const p = panRef.current;
//     return {
//       x: worldX * zoom + p.x,
//       y: worldY * zoom + p.y,
//     };
//   };

//   useLayoutEffect(() => {
//     const measure = () => {
//       const vp = viewportRef.current;
//       if (!vp) return;

//       const r = vp.getBoundingClientRect();
//       const w = Math.round(r.width);
//       const h = Math.round(r.height);

//       // init pan so world origin is centered in viewport
//       if (!didInitPanRef.current && w > 0 && h > 0) {
//         setPan({ x: w / 2, y: h / 2 });
//         didInitPanRef.current = true;
//       }
//     };

//     measure();
//     window.addEventListener("resize", measure);
//     return () => window.removeEventListener("resize", measure);
//   }, []);

//   const keepViewCenteredWhileZooming = (nextZoom: number) => {
//     const { w, h } = getViewportSize();
//     if (!w || !h) return;

//     const p = panRef.current;

//     // world coord at viewport center before zoom
//     const centerWorldX = (w / 2 - p.x) / zoom;
//     const centerWorldY = (h / 2 - p.y) / zoom;

//     setZoom(nextZoom);

//     // choose pan so the same world center stays at viewport center
//     setPan({
//       x: w / 2 - centerWorldX * nextZoom,
//       y: h / 2 - centerWorldY * nextZoom,
//     });
//   };

//   const zoomIn = () => keepViewCenteredWhileZooming(clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
//   const zoomOut = () => keepViewCenteredWhileZooming(clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
//   const zoomReset = () => keepViewCenteredWhileZooming(1);

//   // Dragging
//   const draggedNoteRef = useRef<string | null>(null);
//   const dragOffsetWorldRef = useRef({ x: 0, y: 0 });

//   // Panning drag
//   const isPanningRef = useRef(false);
//   const panStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

//   const handleViewportMouseDown = (e: React.MouseEvent) => {
//     // start panning only when clicking empty background
//     if (e.button !== 0) return;
//     if (e.target !== e.currentTarget) return;

//     isPanningRef.current = true;
//     panStartRef.current = {
//       x: panRef.current.x,
//       y: panRef.current.y,
//       cx: e.clientX,
//       cy: e.clientY,
//     };
//   };

//   const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
//     const note = notesRef.current.find((n) => n.id === noteId);
//     if (!note) return;

//     const p = screenToWorld(e.clientX, e.clientY);
//     dragOffsetWorldRef.current = { x: p.x - note.x, y: p.y - note.y };

//     draggedNoteRef.current = noteId;
//     setDraggedNote(noteId);
//   };

//   useEffect(() => {
//     const lastSentAtRef = { current: 0 };
//     const lastPosRef = { current: { x: 0, y: 0 } };

//     let rafId: number | null = null;
//     let pending: { id: string; x: number; y: number } | null = null;

//     const flush = () => {
//       rafId = null;
//       if (!pending) return;

//       const { id, x, y } = pending;
//       pending = null;
//       setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
//     };

//     const sendPosition = async (id: string, x: number, y: number) => {
//       const token = getEditToken(id);
//       try {
//         await fetch(`/api/notes/${id}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ editToken: token || "guest", patch: { x, y } }),
//         });
//       } catch {
//         // ignore
//       }
//     };

//     const onMove = (e: MouseEvent) => {
//       // Panning
//       if (isPanningRef.current && !draggedNoteRef.current) {
//         const s = panStartRef.current;
//         if (!s) return;
//         setPan({ x: s.x + (e.clientX - s.cx), y: s.y + (e.clientY - s.cy) });
//         return;
//       }

//       // Dragging a note
//       const id = draggedNoteRef.current;
//       if (!id) return;

//       const p = screenToWorld(e.clientX, e.clientY);
//       const off = dragOffsetWorldRef.current;

//       const newX = p.x - off.x;
//       const newY = p.y - off.y;

//       lastPosRef.current = { x: newX, y: newY };

//       pending = { id, x: newX, y: newY };
//       if (rafId === null) rafId = requestAnimationFrame(flush);

//       const now = Date.now();
//       if (now - lastSentAtRef.current >= 120) {
//         lastSentAtRef.current = now;
//         void sendPosition(id, newX, newY);
//       }
//     };

//     const onUp = async () => {
//       isPanningRef.current = false;
//       panStartRef.current = null;

//       const id = draggedNoteRef.current;
//       if (!id) return;

//       draggedNoteRef.current = null;
//       setDraggedNote(null);

//       if (rafId !== null) {
//         cancelAnimationFrame(rafId);
//         rafId = null;
//       }
//       flush();

//       const { x, y } = lastPosRef.current;
//       await sendPosition(id, x, y);
//     };

//     window.addEventListener("mousemove", onMove);
//     window.addEventListener("mouseup", onUp);
//     return () => {
//       window.removeEventListener("mousemove", onMove);
//       window.removeEventListener("mouseup", onUp);
//       if (rafId !== null) cancelAnimationFrame(rafId);
//     };
//   }, [zoom]); // zoom affects coordinate conversion

//   const postFromModal = async () => {
//     if (isPosting) return;
//     if (!draftContent.trim()) return;

//     setIsPosting(true);

//     const id = crypto.randomUUID();
//     const editToken = crypto.randomUUID();
//     setEditToken(id, editToken);

//     const { w, h } = getViewportSize();
//     const centerWorld = {
//       x: (w / 2 - panRef.current.x) / zoom,
//       y: (h / 2 - panRef.current.y) / zoom,
//     };

//     const placement = findNonOverlappingPositionPx(notesRef.current, {
//       x: centerWorld.x - NOTE_W / 2,
//       y: centerWorld.y - NOTE_H / 2,
//     });

//     const x = placement.xPx;
//     const y = placement.yPx;
//     const rotation = Math.random() * 10 - 5;

//     try {
//       const res = await fetch("/api/notes", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id,
//           editToken,
//           author: draftAuthor,
//           to_name: draftTo,
//           content: draftContent,
//           color: draftColor,
//           x,
//           y,
//           rotation,
//           track_id: draftTrack?.id ?? null,
//           track_name: draftTrack?.name ?? null,
//           track_artists: draftTrack?.artists ?? null,
//           track_image: draftTrack?.image ?? null,
//           track_preview_url: draftTrack?.previewUrl ?? null,
//           track_spotify_url: draftTrack?.spotifyUrl ?? null,
//         }),
//       });

//       if (!res.ok) throw new Error(await res.text().catch(() => "POST failed"));
//       const data = (await res.json()) as { note: ApiNote; editToken: string };

//       if (data.editToken) setEditToken(id, data.editToken);
//       setIsCreateOpen(false);

//       setNotes((prev) => (prev.some((n) => n.id === data.note.id) ? prev : [...prev, apiToUi(data.note)]));

//       // Keep burst API as % by converting world->screen->%
//       const local = worldToScreenLocal(x, y);
//       if (w > 0 && h > 0) {
//         setBurst({ xPct: (local.x / w) * 100, yPct: (local.y / h) * 100, key: Date.now() });
//         setTimeout(() => setBurst(null), 800);
//       }
//     } catch (e) {
//       console.error(e);
//       removeEditToken(id);
//       alert("Failed to post note. Please try again.");
//     } finally {
//       setIsPosting(false);
//     }
//   };

//   // ...existing realtime subscription code remains...

//   return (
//     <>
//       {showIntro && <ValentinesIntro onComplete={() => setShowIntro(false)} />}

//       <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
//         <Header />

//         <SearchFilter
//           value={searchQuery}
//           onChange={setSearchQuery}
//           onClear={handleClearSearch}
//           resultCount={filteredNotes.length}
//           totalCount={notes.length}
//         />

//         <FallingHeartsBackground />

//         {/* Viewport (captures panning) */}
//         <div
//           ref={viewportRef}
//           className="absolute inset-0 overflow-hidden z-20"
//           onMouseDown={handleViewportMouseDown}
//         >
//           {/* World layer */}
//           <div
//             className="absolute inset-0"
//             style={{
//               transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
//               transformOrigin: "0 0",
//               willChange: "transform",
//             }}
//           >
//             <NoteHeartsBurst burst={burst} />

//             <Canvas
//               ref={canvasRef}
//               notes={notes}
//               ownedNoteIds={ownedNoteIds}
//               visibleNoteIds={visibleNoteIds}
//               onMouseMove={() => {}}
//               onMouseUp={() => {}}
//               onMouseDown={handleMouseDown}
//               onDeleteNote={deleteNote}
//               onOpenNote={handleOpenNote}
//             />
//           </div>
//         </div>

//         <Toolbar onAddNote={addNote} />

//         <ZoomControls
//           zoom={zoom}
//           minZoom={MIN_ZOOM}
//           maxZoom={MAX_ZOOM}
//           onZoomIn={zoomIn}
//           onZoomOut={zoomOut}
//           onReset={zoomReset}
//         />

//         <NoteDetailsModal isOpen={!!selectedNoteId} note={selectedNote} onClose={() => setSelectedNoteId(null)} />

//         <CreateNoteModal
//           isOpen={isCreateOpen}
//           isPosting={isPosting}
//           author={draftAuthor}
//           to={draftTo}
//           content={draftContent}
//           selectedColor={draftColor}
//           colors={PASTEL_COLORS}
//           selectedTrack={draftTrack}
//           onAuthorChange={setDraftAuthor}
//           onToChange={setDraftTo}
//           onContentChange={setDraftContent}
//           onColorChange={setDraftColor}
//           onSelectTrack={setDraftTrack}
//           onClose={() => (isPosting ? null : setIsCreateOpen(false))}
//           onCreate={postFromModal}
//         />
//       </div>
//     </>
//   );
// }
