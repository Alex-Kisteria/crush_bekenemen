import React from "react";

interface HeartNoteProps {
  message: string;
  nickname: string;
  date: string;
}

export default function HeartNote({ message, nickname, date }: HeartNoteProps) {
  return (
    // The container for the heart
    <div className="relative w-64 h-64 flex items-center justify-center hover:scale-105 transition-transform duration-300">
      {/* The Background Shape: 
        We use an SVG here because it's easier to put text inside an SVG 
        than purely CSS shapes. It draws a pink heart.
      */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="absolute w-full h-full text-pink-400 drop-shadow-lg"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>

      {/* The Content Area */}
      <div className="relative z-10 w-40 text-center flex flex-col items-center justify-center text-white">
        {/* The Message */}
        <p className="font-medium text-sm break-words line-clamp-4 leading-tight mb-2">
          "{message}"
        </p>

        {/* Nickname & Date */}
        <div className="text-xs opacity-90 border-t border-pink-300 pt-1 mt-1">
          <p className="font-bold">~ {nickname}</p>
          <p className="text-[10px]">{date}</p>
        </div>
      </div>
    </div>
  );
}
