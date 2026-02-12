import { forwardRef } from "react";
import { Note } from "@/types/note";
import StickyNote from "./StickyNote";

type NotePatch = Partial<
  Pick<Note, "author" | "to" | "content" | "color" | "x" | "y" | "rotation">
>;

interface CanvasProps {
  notes: Note[];
  editingNoteId: string | null;

  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseDown: (e: React.MouseEvent, noteId: string) => void;
  onDeleteNote: (noteId: string) => void;

  onUpdateNote: (noteId: string, patch: NotePatch) => void;
  onFinishEdit: (noteId: string) => void;
  onCancelEdit: (noteId: string) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(
  (
    {
      notes,
      editingNoteId,
      onMouseMove,
      onMouseUp,
      onMouseDown,
      onDeleteNote,
      onUpdateNote,
      onFinishEdit,
      onCancelEdit,
    },
    ref,
  ) => {
    return (
      <>
        {/* Heart Pattern Background - Much smaller hearts like dots */}
        {/* <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 6c-0.7-1.4-2.3-1.8-3.6-0.9s-1.8 2.3-0.9 3.6c0.5 0.7 2.7 2.7 4.5 4.5 1.8-1.8 4-3.8 4.5-4.5 0.9-1.4 0.4-2.7-0.9-3.6s-2.9-0.5-3.6 0.9z' fill='%23ff6b9d' fill-opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "10px 10px",
          }}
        /> */}

        {/* Canvas for notes */}
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
              isEditing={editingNoteId === note.id}
              onMouseDown={onMouseDown}
              onDelete={onDeleteNote}
              onUpdateNote={onUpdateNote}
              onFinishEdit={onFinishEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      </>
    );
  },
);

Canvas.displayName = "Canvas";

export default Canvas;
