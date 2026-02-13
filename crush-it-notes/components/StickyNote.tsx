import { Note } from "@/types/note";
import { useRef } from "react";

type NotePatch = Partial<
  Pick<Note, "author" | "to" | "content" | "color" | "x" | "y" | "rotation">
>;

interface StickyNoteProps {
  note: Note;
  isEditing?: boolean;
  isPosting?: boolean;
  onMouseDown: (e: React.MouseEvent, noteId: string) => void;
  onDelete: (noteId: string) => void;

  onUpdateNote: (noteId: string, patch: NotePatch) => void;
  onFinishEdit: (noteId: string) => void;
  onCancelEdit: (noteId: string) => void;
}

export default function StickyNote({
  note,
  isEditing = false,
  isPosting = false,
  onMouseDown,
  onDelete,
  onUpdateNote,
  onFinishEdit,
  onCancelEdit,
}: StickyNoteProps) {
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const authorLabel = note.author.trim() ? note.author.trim() : "Anonymous";
  const toLabel = note.to.trim();

  return (
    <div
      className={[
        "absolute w-[240px] h-[200px] p-4 shadow-lg transition-shadow hover:shadow-2xl group rounded-xl",
        isEditing ? "cursor-text ring-2 ring-rose-300" : "cursor-move",
      ].join(" ")}
      style={{
        left: `${note.x}%`,
        top: `${note.y}%`,
        backgroundColor: note.color,
        transform: `rotate(${note.rotation}deg)`,
      }}
      onMouseDown={(e) => {
        if (isEditing) return;
        e.preventDefault();
        onMouseDown(e, note.id);
      }}
    >
      {!isEditing && (
        <button
          onClick={() => onDelete(note.id)}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-400 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-rose-500"
          title="Delete note"
        >
          ×
        </button>
      )}

      {isEditing ? (
        <div className="h-full flex flex-col gap-2">
          <input
            value={note.author}
            onChange={(e) => onUpdateNote(note.id, { author: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit(note.id);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                messageRef.current?.focus();
              }
            }}
            placeholder="From (optional)"
            className="w-full bg-transparent outline-none text-gray-800 text-xs font-note placeholder:text-gray-600/60 border-b border-black/10 pb-1"
          />

          <input
            value={note.to}
            onChange={(e) => onUpdateNote(note.id, { to: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit(note.id);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                messageRef.current?.focus();
              }
            }}
            placeholder="To (for filtering)"
            className="w-full bg-transparent outline-none text-gray-800 text-xs font-note placeholder:text-gray-600/60 border-b border-black/10 pb-1"
          />

          <textarea
            ref={messageRef}
            autoFocus
            value={note.content}
            onChange={(e) => onUpdateNote(note.id, { content: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit(note.id);
              }
              // NOTE: Do NOT post on Enter anymore.
              // Enter behaves normally (new line). Posting happens only via the Post button.
            }}
            placeholder="Type your message..."
            className="w-full flex-1 bg-transparent resize-none outline-none text-gray-800 text-sm whitespace-pre-wrap break-words font-note"
          />

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onCancelEdit(note.id)}
              disabled={isPosting}
              className="px-3 py-1.5 rounded-lg text-xs border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:hover:bg-transparent"
              title="Discard"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={() => onFinishEdit(note.id)}
              disabled={isPosting}
              className="px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:brightness-105 shadow-sm disabled:opacity-70 disabled:hover:brightness-100"
              title="Post note"
            >
              {isPosting ? "..." : "Post"}
            </button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col gap-2">
          <div className="text-gray-800 text-xs font-note leading-tight">
            <div className="truncate">
              <span className="opacity-70">From:</span> {authorLabel}
            </div>
            <div className="truncate">
              <span className="opacity-70">To:</span> {toLabel || "—"}
            </div>
          </div>

          <div className="text-gray-800 text-sm whitespace-pre-wrap break-words overflow-auto font-note">
            {note.content}
          </div>
        </div>
      )}
    </div>
  );
}
