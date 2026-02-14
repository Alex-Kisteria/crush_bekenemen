// // ...existing code...
// export default function ValentinesNotesPage() {
//   // ...existing code...

//   // Track pointer(s) for mobile gestures
//   const pointersRef = useRef(new Map<number, { x: number; y: number }>());
//   const panPointerIdRef = useRef<number | null>(null);
//   const dragPointerIdRef = useRef<number | null>(null);

//   const pinchRef = useRef<{
//     startDist: number;
//     startZoom: number;
//     worldAtMid: { x: number; y: number };
//     midLocal: { x: number; y: number };
//   } | null>(null);

//   const viewportLocalPoint = (clientX: number, clientY: number) => {
//     const vp = viewportRef.current;
//     if (!vp) return { x: 0, y: 0 };
//     const r = vp.getBoundingClientRect();
//     return { x: clientX - r.left, y: clientY - r.top };
//   };

//   const startPinchIfReady = () => {
//     if (pointersRef.current.size !== 2) return;

//     const vp = viewportRef.current;
//     if (!vp) return;

//     const pts = Array.from(pointersRef.current.values());
//     const a = pts[0];
//     const b = pts[1];

//     const dx = b.x - a.x;
//     const dy = b.y - a.y;
//     const dist = Math.hypot(dx, dy);
//     if (!Number.isFinite(dist) || dist <= 0) return;

//     const midClient = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
//     const midLocal = viewportLocalPoint(midClient.x, midClient.y);
//     const worldAtMid = screenToWorld(midClient.x, midClient.y);

//     pinchRef.current = {
//       startDist: dist,
//       startZoom: zoom,
//       worldAtMid,
//       midLocal,
//     };

//     // stop one-finger pan when pinch starts
//     isPanningRef.current = false;
//     panStartRef.current = null;
//     panPointerIdRef.current = null;
//   };

//   const handleViewportPointerDown = (e: React.PointerEvent) => {
//     // Pan/pinch only when touching empty background
//     if (e.target !== e.currentTarget) return;

//     // left mouse only (touch is fine)
//     if (e.pointerType === "mouse" && e.button !== 0) return;

//     e.preventDefault();

//     try {
//       (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
//     } catch {
//       // ignore
//     }

//     pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

//     // if 2 fingers => pinch
//     if (pointersRef.current.size === 2) {
//       startPinchIfReady();
//       return;
//     }

//     // 1 finger => pan
//     isPanningRef.current = true;
//     panPointerIdRef.current = e.pointerId;
//     panStartRef.current = {
//       x: panRef.current.x,
//       y: panRef.current.y,
//       cx: e.clientX,
//       cy: e.clientY,
//     };
//   };

//   const handlePointerDownNote = (e: React.PointerEvent, noteId: string) => {
//     // PointerDown from note (owners only; gated in StickyNote)
//     dragPointerIdRef.current = e.pointerId;

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
//       if (!token) return;
//       try {
//         await fetch(`/api/notes/${id}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ editToken: token, patch: { x, y } }),
//         });
//       } catch {
//         // ignore
//       }
//     };

//     const onPointerMove = (e: PointerEvent) => {
//       // keep pointer positions for pinch
//       if (pointersRef.current.has(e.pointerId)) {
//         pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
//       }

//       // Pinch zoom (only when not dragging a note)
//       if (!draggedNoteRef.current && pinchRef.current && pointersRef.current.size === 2) {
//         const pts = Array.from(pointersRef.current.values());
//         const a = pts[0];
//         const b = pts[1];
//         const dist = Math.hypot(b.x - a.x, b.y - a.y);
//         const pinch = pinchRef.current;

//         const nextZoom = clamp(
//           pinch.startZoom * (dist / pinch.startDist),
//           MIN_ZOOM,
//           MAX_ZOOM,
//         );

//         // Keep world point under midpoint stable
//         setZoom(nextZoom);
//         setPan({
//           x: pinch.midLocal.x - pinch.worldAtMid.x * nextZoom,
//           y: pinch.midLocal.y - pinch.worldAtMid.y * nextZoom,
//         });

//         return;
//       }

//       // Panning (1 finger)
//       if (
//         isPanningRef.current &&
//         panPointerIdRef.current === e.pointerId &&
//         !draggedNoteRef.current
//       ) {
//         const s = panStartRef.current;
//         if (!s) return;
//         setPan({ x: s.x + (e.clientX - s.cx), y: s.y + (e.clientY - s.cy) });
//         return;
//       }

//       // Dragging a note (owner)
//       const id = draggedNoteRef.current;
//       if (!id) return;
//       if (dragPointerIdRef.current !== e.pointerId) return;
//       if (!getEditToken(id)) return;

//       const p = screenToWorld(e.clientX, e.clientY);
//       const off = dragOffsetWorldRef.current;
//       const newX = p.x - off.x;
//       const newY = p.y - off.y;

//       lastLocalMoveAtRef.current[id] = Date.now();
//       lastPosRef.current = { x: newX, y: newY };

//       pending = { id, x: newX, y: newY };
//       if (rafId === null) rafId = requestAnimationFrame(flush);

//       const now = Date.now();
//       if (now - lastSentAtRef.current >= 120) {
//         lastSentAtRef.current = now;
//         void sendPosition(id, newX, newY);
//       }
//     };

//     const endPointer = async (pointerId: number) => {
//       // remove from pinch tracking
//       pointersRef.current.delete(pointerId);

//       // if we drop below 2 pointers, stop pinch
//       if (pointersRef.current.size < 2) pinchRef.current = null;

//       // end pan
//       if (panPointerIdRef.current === pointerId) {
//         isPanningRef.current = false;
//         panStartRef.current = null;
//         panPointerIdRef.current = null;
//       }

//       // end drag
//       if (dragPointerIdRef.current !== pointerId) return;

//       const id = draggedNoteRef.current;
//       dragPointerIdRef.current = null;
//       if (!id) return;

//       draggedNoteRef.current = null;
//       setDraggedNote(null);

//       if (rafId !== null) {
//         cancelAnimationFrame(rafId);
//         rafId = null;
//       }
//       flush();

//       const { x, y } = lastPosRef.current;
//       const others = notesRef.current.filter((n) => n.id !== id);
//       const snapped = findNonOverlappingPositionPx(others, { x, y });

//       lastLocalMoveAtRef.current[id] = Date.now();

//       if (snapped.xPx !== x || snapped.yPx !== y) {
//         setNotes((prev) =>
//           prev.map((n) => (n.id === id ? { ...n, x: snapped.xPx, y: snapped.yPx } : n)),
//         );
//         await sendPosition(id, snapped.xPx, snapped.yPx);
//       } else {
//         await sendPosition(id, x, y);
//       }

//       lastDragRef.current = { id, at: Date.now() };
//     };

//     const onPointerUp = (e: PointerEvent) => void endPointer(e.pointerId);
//     const onPointerCancel = (e: PointerEvent) => void endPointer(e.pointerId);

//     window.addEventListener("pointermove", onPointerMove);
//     window.addEventListener("pointerup", onPointerUp);
//     window.addEventListener("pointercancel", onPointerCancel);

//     return () => {
//       window.removeEventListener("pointermove", onPointerMove);
//       window.removeEventListener("pointerup", onPointerUp);
//       window.removeEventListener("pointercancel", onPointerCancel);
//       if (rafId !== null) cancelAnimationFrame(rafId);
//     };
//   }, [zoom, MIN_ZOOM, MAX_ZOOM]);

//   // ...existing code...

//   return (
//     <>
//       {/* ...existing code... */}

//       <div
//         ref={viewportRef}
//         className="absolute inset-0 overflow-hidden z-20"
//         onPointerDown={handleViewportPointerDown}
//         style={{
//           // Critical: allow custom pan/zoom on mobile instead of browser scrolling
//           touchAction: "none",
//         }}
//       >
//         <div
//           className="absolute inset-0"
//           style={{
//             transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
//             transformOrigin: "0 0",
//             willChange: "transform",
//           }}
//         >
//           <NoteHeartsBurst burst={burst} />

//           <Canvas
//             ref={canvasRef}
//             notes={notes}
//             ownedNoteIds={ownedNoteIds}
//             visibleNoteIds={visibleNoteIds}
//             onPointerDown={handlePointerDownNote}
//             onDeleteNote={deleteNote}
//             onOpenNote={handleOpenNote}
//           />
//         </div>
//       </div>

//       {/* ...existing code... */}
//     </>
//   );
// }
