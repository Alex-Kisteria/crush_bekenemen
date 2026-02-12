import React from 'react';

interface HeartNoteProps {
  id: number;
  message: string;
  nickname: string;
  date: string;
  rotation: number;
  onDelete: (id: number, pin: string) => void;
  onClick: () => void; // New prop to handle opening the note
}

export default function HeartNote({ id, message, nickname, date, rotation, onDelete, onClick }: HeartNoteProps) {
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop the click from opening the modal
    const pin = prompt("Enter Admin PIN to delete this post:");
    if (pin && onDelete) {
      onDelete(id, pin);
    }
  };

  return (
    <div 
      onClick={onClick} // Open the modal on click
      className="relative w-64 h-64 hover:z-50 cursor-pointer group" 
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="w-full h-full relative flex items-center justify-center hover:scale-110 transition-transform duration-300 origin-center">
        
        {/* Admin Delete Button */}
        <button 
          onClick={handleDeleteClick}
          className="absolute -top-2 -right-2 bg-gray-800 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center justify-center text-xs font-bold hover:bg-red-600"
          title="Admin Delete"
        >
          X
        </button>

        {/* Pin */}
        <div className="absolute top-2 z-20 w-4 h-4 rounded-full bg-red-600 shadow-md border border-red-800">
           <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-white opacity-40"></div>
        </div>

        {/* SVG Heart + Texture */}
        <svg viewBox="0 0 24 24" className="absolute w-full h-full drop-shadow-lg">
          
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#f472b6" />
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="transparent" filter="url(#paper-texture)" className="opacity-60" />
        </svg>

        {/* Content */}
        <div className="relative z-10 w-40 text-center flex flex-col items-center justify-center text-white pt-4">
          <p className="font-medium text-sm break-words line-clamp-4 leading-tight mb-2 drop-shadow-sm">
            "{message}"
          </p>
          <div className="text-xs opacity-90 border-t border-pink-200/50 pt-1 mt-1">
            <p className="font-bold">~ {nickname}</p>
            <p className="text-[10px]">{date}</p>
          </div>
        </div>

      </div>
    </div>
  );
}