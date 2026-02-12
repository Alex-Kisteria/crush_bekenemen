import { useEffect, useRef } from "react";
import { StickyNoteIcon } from "lucide-react";

interface ToolbarProps {
  onAddNote: () => void;

  colors: string[];
  selectedColor: string;
  isColorPickerOpen: boolean;
  onSelectColor: (color: string) => void;
  onCloseColorPicker: () => void;
}

export default function Toolbar({
  onAddNote,
  colors,
  selectedColor,
  isColorPickerOpen,
  onSelectColor,
  onCloseColorPicker,
}: ToolbarProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isColorPickerOpen) return;

    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (pickerRef.current && !pickerRef.current.contains(target)) {
        onCloseColorPicker();
      }
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isColorPickerOpen, onCloseColorPicker]);

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

        {isColorPickerOpen && (
          <div
            ref={pickerRef}
            className="absolute -top-[130%] w-49 bg-white/95 backdrop-blur rounded-2xl border border-rose-100 shadow-xl p-3 z-50"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => onSelectColor(color)}
                  className="w-9 h-9 rounded-lg transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    border:
                      selectedColor === color
                        ? "3px solid #e11d48"
                        : "2px solid #fecdd3",
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
