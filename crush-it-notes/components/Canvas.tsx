import { forwardRef } from "react";
import { Note } from "@/types/note";
import StickyNote from "./StickyNote";

type NotePatch = Partial<
  Pick<Note, "author" | "to" | "content" | "color" | "x" | "y" | "rotation">
>;

interface CanvasProps {
  notes: Note[];
  editingNoteId: string | null;
  postingNoteId: string | null;

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
      postingNoteId,
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
              isPosting={postingNoteId === note.id} // <-- add
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
