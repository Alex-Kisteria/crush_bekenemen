// interface ConfettiAnimationProps {
//   show: boolean;
// }

// export default function ConfettiAnimation({ show }: ConfettiAnimationProps) {
//   if (!show) return null;

//   return (
//     <>
//       <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
//         {[...Array(30)].map((_, i) => (
//           <div
//             key={i}
//             className="absolute animate-fall"
//             style={{"use client";

// import { useEffect, useRef, useState } from "react";
// import Header from "@/components/Header";
// import Canvas from "@/components/Canvas";
// import Toolbar from "@/components/Toolbar";
// import ZoomControls from "@/components/Zoomcontrols";
// import ShareButton from "@/components/ShareButton";
// import FallingHeartsBackground from "@/components/FallingHeartsBackground";
// import NoteHeartsBurst, { NoteBurst } from "@/components/NotesHeartsBurst";
// import { Note } from "@/types/note";

// // ...existing code...

// // IMPORTANT: match your StickyNote sizing.
// // Your StickyNote currently uses: w-60 (240px). h-50 depends on your Tailwind config.
// // If h-50 isn't a real class, fix the StickyNote height and update NOTE_H here too.
// const NOTE_W = 240;
// const NOTE_H = 200;

// // ...existing code...

// type CanvasSize = { width: number; height: number };

// function noteToRectPx(note: Note, canvas: CanvasSize): RectPx {
//   const left = (note.x / 100) * canvas.width;
//   const top = (note.y / 100) * canvas.height;
//   return {
//     left,
//     top,
//     right: left + NOTE_W,
//     bottom: top + NOTE_H,
//   };
// }

// function findNonOverlappingPositionPx(
//   existingNotes: Note[],
//   canvas: CanvasSize,
// ): { xPx: number; yPx: number } {
//   const maxX = canvas.width - NOTE_W;
//   const maxY = canvas.height - NOTE_H;

//   if (maxX <= 0 || maxY <= 0) return { xPx: 0, yPx: 0 };

//   const existingRects = existingNotes.map((n) => noteToRectPx(n, canvas));

//   const fits = (xPx: number, yPx: number) => {
//     const rect = candidateToRectPx(xPx, yPx);
//     return !existingRects.some((r) =>
//       rectsOverlapMoreThan(rect, r, MAX_OVERLAP_PX),
//     );
//   };

//   const centerX = clamp(canvas.width / 2 - NOTE_W / 2, 0, maxX);
//   const centerY = clamp(canvas.height / 2 - NOTE_H / 2, 0, maxY);

//   const STEP = 24;
//   const maxR = Math.hypot(canvas.width, canvas.height);

//   if (fits(centerX, centerY)) return { xPx: centerX, yPx: centerY };

//   for (let r = STEP; r <= maxR; r += STEP) {
//     for (let k = 0; k < 8; k++) {
//       const angle = (Math.PI * 2 * k) / 8;
//       const x = clamp(centerX + r * Math.cos(angle), 0, maxX);
//       const y = clamp(centerY + r * Math.sin(angle), 0, maxY);
//       if (fits(x, y)) return { xPx: x, yPx: y };
//     }
//   }

//   for (let y = 0; y <= maxY; y += STEP) {
//     for (let x = 0; x <= maxX; x += STEP) {
//       if (fits(x, y)) return { xPx: x, yPx: y };
//     }
//   }

//   return { xPx: centerX, yPx: centerY };
// }

// export default function ValentinesNotesPage() {
//   const [notes, setNotes] = useState<Note[]>([]);
//   const [draggedNote, setDraggedNote] = useState<string | null>(null);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

//   const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
//   const [burst, setBurst] = useState<NoteBurst>(null);

//   const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
//   const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
//   const [pendingCreate, setPendingCreate] = useState(false);

//   // Zoom
//   const [zoom, setZoom] = useState(1);
//   const MIN_ZOOM = 0.6;
//   const MAX_ZOOM = 1.8;
//   const ZOOM_STEP = 0.1;

//   // Scrollable viewport (for scrollbars when zoomed in)
//   const viewportRef = useRef<HTMLDivElement>(null);

//   // This is the *base* (unscaled) canvas size. We track it from the viewport size.
//   const [baseSize, setBaseSize] = useState<CanvasSize>({ width: 0, height: 0 });

//   const canvasRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const el = viewportRef.current;
//     if (!el) return;

//     const ro = new ResizeObserver(() => {
//       setBaseSize({ width: el.clientWidth, height: el.clientHeight });
//     });

//     ro.observe(el);
//     setBaseSize({ width: el.clientWidth, height: el.clientHeight });

//     return () => ro.disconnect();
//   }, []);

//   const keepViewCenteredWhileZooming = (nextZoom: number) => {
//     const vp = viewportRef.current;
//     if (!vp) return;

//     const vw = vp.clientWidth;
//     const vh = vp.clientHeight;

//     // current center in "unscaled world pixels"
//     const centerX = (vp.scrollLeft + vw / 2) / zoom;
//     const centerY = (vp.scrollTop + vh / 2) / zoom;

//     // update zoom, then re-center after layout paints
//     setZoom(nextZoom);

//     requestAnimationFrame(() => {
//       vp.scrollLeft = centerX * nextZoom - vw / 2;
//       vp.scrollTop = centerY * nextZoom - vh / 2;
//     });
//   };

//   const zoomIn = () => keepViewCenteredWhileZooming(clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
//   const zoomOut = () => keepViewCenteredWhileZooming(clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
//   const zoomReset = () => keepViewCenteredWhileZooming(1);

//   const updateNote = (noteId: string, patch: NotePatch) => {
//     setNotes((prev) =>
//       prev.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
//     );
//   };

//   const addNote = () => {
//     if (editingNoteId) return;
//     setPendingCreate(true);
//     setIsColorPickerOpen(true);
//   };

//   const createNoteWithColor = (color: string) => {
//     const id = Date.now().toString();

//     const canvasSize: CanvasSize =
//       baseSize.width > 0 && baseSize.height > 0
//         ? baseSize
//         : { width: 1000, height: 700 };

//     const placement = findNonOverlappingPositionPx(notes, canvasSize);

//     const x = (placement.xPx / canvasSize.width) * 100;
//     const y = (placement.yPx / canvasSize.height) * 100;

//     const newNote: Note = {
//       id,
//       author: "",
//       to: "",
//       content: "",
//       color,
//       x: clamp(x, 0, 95),
//       y: clamp(y, 0, 95),
//       rotation: Math.random() * 10 - 5,
//     };

//     setNotes((prev) => [...prev, newNote]);
//     setEditingNoteId(id);
//   };

//   const deleteNote = (noteId: string) => {
//     setNotes((prev) => prev.filter((n) => n.id !== noteId));
//     if (editingNoteId === noteId) setEditingNoteId(null);
//   };

//   const finishEdit = (noteId: string) => {
//     const note = notes.find((n) => n.id === noteId);
//     if (!note) return;

//     if (!note.content.trim()) {
//       deleteNote(noteId);
//       return;
//     }

//     setEditingNoteId(null);

//     // Burst aligns better if it's rendered inside the same zoomed canvas wrapper (below).
//     setBurst({ xPct: note.x, yPct: note.y, key: Date.now() });
//     setTimeout(() => setBurst(null), 800);
//   };

//   const cancelEdit = (noteId: string) => deleteNote(noteId);

//   const selectColor = (color: string) => {
//     setSelectedColor(color);

//     if (pendingCreate) {
//       createNoteWithColor(color);
//       setPendingCreate(false);
//       setIsColorPickerOpen(false);
//       return;
//     }

//     if (editingNoteId) {
//       setNotes((prev) =>
//         prev.map((n) => (n.id === editingNoteId ? { ...n, color } : n)),
//       );
//     }
//   };

//   const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
//     if (editingNoteId === noteId) return;

//     const note = notes.find((n) => n.id === noteId);
//     if (!note || !canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const noteX = (note.x / 100) * rect.width;
//     const noteY = (note.y / 100) * rect.height;

//     setDragOffset({ x: e.clientX - noteX, y: e.clientY - noteY });
//     setDraggedNote(noteId);
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (!draggedNote || !canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const newX = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
//     const newY = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;

//     setNotes((prev) =>
//       prev.map((note) =>
//         note.id === draggedNote
//           ? { ...note, x: clamp(newX, 0, 95), y: clamp(newY, 0, 95) }
//           : note,
//       ),
//     );
//   };

//   const handleMouseUp = () => setDraggedNote(null);

//   return (
//     <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
//       <Header />

//       {/* Constant falling hearts background */}
//       <FallingHeartsBackground />

//       {/* Scrollable zoom viewport (scrollbars appear when zoom > 1) */}
//       <div ref={viewportRef} className="absolute inset-0 overflow-auto z-20">
//         {/* This element defines the scrollable content size */}
//         <div
//           className="relative"
//           style={{
//             width: `${baseSize.width * zoom}px`,
//             height: `${baseSize.height * zoom}px`,
//           }}
//         >
//           {/* This element is the "base canvas" scaled visually */}
//           <div
//             className="absolute left-0 top-0"
//             style={{
//               width: `${baseSize.width}px`,
//               height: `${baseSize.height}px`,
//               transform: `scale(${zoom})`,
//               transformOrigin: "top left",
//             }}
//           >
//             {/* Burst rendered inside the zoomed canvas so it stays aligned */}
//             <NoteHeartsBurst burst={burst} />

//             <Canvas
//               ref={canvasRef}
//               notes={notes}
//               editingNoteId={editingNoteId}
//               onMouseMove={handleMouseMove}
//               onMouseUp={handleMouseUp}
//               onMouseDown={handleMouseDown}
//               onDeleteNote={deleteNote}
//               onUpdateNote={updateNote}
//               onFinishEdit={finishEdit}
//               onCancelEdit={cancelEdit}
//             />
//           </div>
//         </div>
//       </div>

//       <Toolbar
//         onAddNote={addNote}
//         colors={PASTEL_COLORS}
//         selectedColor={selectedColor}
//         isColorPickerOpen={isColorPickerOpen}
//         onSelectColor={selectColor}
//         onCloseColorPicker={() => {
//           setIsColorPickerOpen(false);
//           setPendingCreate(false);
//         }}
//       />

//       <ZoomControls
//         zoom={zoom}
//         minZoom={MIN_ZOOM}
//         maxZoom={MAX_ZOOM}
//         onZoomIn={zoomIn}
//         onZoomOut={zoomOut}
//         onReset={zoomReset}
//       />

//       <ShareButton />
//     </div>
//   );
// }
//               left: `${Math.random() * 100}%`,
//               top: "-10px",
//               animationDelay: `${Math.random() * 0.5}s`,
//               animationDuration: `${2 + Math.random()}s`,
//             }}
//           >
//             {i % 2 === 0 ? (
//               <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff6b9d">
//                 <path d="M12 4c-1.5-3-5-4-8-2s-4 5-2 8c1 1.5 6 6 10 10 4-4 9-8.5 10-10 2-3 1-6-2-8s-6.5-1-8 2z" />
//               </svg>
//             ) : (
//               <div className="w-2 h-2 rounded-full bg-pink-400" />
//             )}
//           </div>
//         ))}
//       </div>

//       <style jsx>{`
//         @keyframes fall {
//           to {
//             transform: translateY(100vh) rotate(360deg);
//             opacity: 0;
//           }
//         }
//         .animate-fall {
//           animation: fall linear forwards;
//         }
//       `}</style>
//     </>
//   );
// }
