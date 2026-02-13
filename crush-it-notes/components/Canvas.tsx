import { forwardRef } from "react";
import { Note } from "@/types/note";
import StickyNote from "./StickyNote";

interface CanvasProps {
  notes: Note[];
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseDown: (e: React.MouseEvent, noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  ({ notes, onMouseMove, onMouseUp, onMouseDown, onDeleteNote }, ref) => {
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
            onMouseDown={onMouseDown}
            onDelete={onDeleteNote}
          />
        ))}
      </div>
    );
  },
);

Canvas.displayName = "Canvas";
export default Canvas;
