import { forwardRef } from "react";
import { Note } from "@/types/note";
import StickyNote from "./StickyNote";

interface CanvasProps {
  notes: Note[];
  ownedNoteIds: Set<string>;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseDown: (e: React.MouseEvent, noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenNote: (noteId: string) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  (
    {
      notes,
      ownedNoteIds,
      onMouseMove,
      onMouseUp,
      onMouseDown,
      onDeleteNote,
      onOpenNote,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className="absolute inset-0 cursor-default"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            isOwner={ownedNoteIds.has(note.id)}
            onMouseDown={onMouseDown}
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
