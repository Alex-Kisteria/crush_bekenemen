interface CreateNoteModalProps {
  isOpen: boolean;
  content: string;
  selectedColor: string;
  colors: string[];
  onContentChange: (content: string) => void;
  onColorChange: (color: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateNoteModal({
  isOpen,
  content,
  selectedColor,
  colors,
  onContentChange,
  onColorChange,
  onClose,
  onCreate,
}: CreateNoteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-[480px] border border-rose-100">
        <h2 className="text-2xl font-bold text-rose-900 mb-6">Create a Note</h2>

        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Write your message..."
          className="w-full h-40 p-4 border-2 border-rose-200 rounded-2xl resize-none focus:outline-none focus:border-rose-400 text-gray-800 placeholder-rose-300"
          autoFocus
          style={{ fontFamily: "'Indie Flower', cursive" }}
        />

        <div className="mt-6">
          <label className="text-sm font-medium text-rose-900 mb-3 block">
            Choose a color:
          </label>
          <div className="flex gap-2 flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className="w-10 h-10 rounded-lg transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  border:
                    selectedColor === color
                      ? "3px solid #e11d48"
                      : "2px solid #fecdd3",
                  transform:
                    selectedColor === color ? "scale(1.1)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-rose-300 text-rose-700 rounded-full font-medium hover:bg-rose-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-medium hover:scale-105 transition-transform shadow-md"
          >
            Post Note ♡
          </button>
        </div>

        {/* Google Font Import for Indie Flower */}
        <link
          href="https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap"
          rel="stylesheet"
        />
      </div>
    </div>
  );
}
