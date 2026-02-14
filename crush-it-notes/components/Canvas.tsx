import { forwardRef } from "react";
import { Note } from "@/types/note";
import StickyNote from "./StickyNote";

interface CanvasProps {
  notes: Note[];
  ownedNoteIds: Set<string>;
  visibleNoteIds: Set<string> | null; // null => all visible
  onPointerDown: (e: React.PointerEvent, noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenNote: (noteId: string) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  (
    {
      notes,
      ownedNoteIds,
      visibleNoteIds,
      onPointerDown,
      onDeleteNote,
      onOpenNote,
    },
    ref,
  ) => {
    return (
      <div ref={ref} className="absolute inset-0 cursor-default">
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            isOwner={ownedNoteIds.has(note.id)}
            isVisible={visibleNoteIds ? visibleNoteIds.has(note.id) : true}
            onPointerDown={onPointerDown}
            onDelete={onDeleteNote}
            onOpen={onOpenNote}
          />
        ))}
      </div>
    );
  },
);

Canvas.displayName = "Canvas";
export default Canvas;
