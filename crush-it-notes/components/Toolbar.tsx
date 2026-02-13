import { StickyNoteIcon } from "lucide-react";

interface ToolbarProps {
  onAddNote: () => void;
}

export default function Toolbar({ onAddNote }: ToolbarProps) {
  return (
    <div className="absolute left-3 top-[85%] -translate-y-1/2 z-50 pointer-events-auto">
      <div className="relative flex flex-col gap-3 rounded-2xl p-3">
        <button
          onClick={onAddNote}
          className="w-15 h-15 rounded-4xl bg-pink-700 backdrop-blur-sm border border-rose-100 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
          title="Add Note"
        >
          <StickyNoteIcon
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </button>
      </div>
    </div>
  );
}
