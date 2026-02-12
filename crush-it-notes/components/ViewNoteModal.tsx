import React from 'react';

interface NoteData {
  id: number;
  message: string;
  nickname: string;
  date: string;
  spotifyId?: string;
}

interface ViewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: NoteData | null;
}

export default function ViewNoteModal({ isOpen, onClose, note }: ViewNoteModalProps) {
  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      
      {/* RESPONSIVE WIDTH: max-w-sm (mobile) -> max-w-2xl (desktop) */}
      <div 
        className="bg-white p-6 rounded-2xl w-full max-w-sm md:max-w-2xl shadow-2xl relative animate-bounce-in text-center flex flex-col items-center"
        onClick={(e) => e.stopPropagation()} 
      >
        <button onClick={onClose} className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        
        <p className="text-xs text-pink-400 font-bold uppercase tracking-widest mb-4">Valentine's Message</p>
        
        {/* The Card View - Adapts to width */}
        <div className="bg-pink-50 p-8 rounded-xl mb-6 transform rotate-1 border border-pink-100 shadow-inner w-full">
          {/* Text scales slightly on desktop */}
          <p className="text-lg md:text-2xl text-gray-800 font-medium leading-relaxed font-serif whitespace-pre-wrap">
            "{note.message}"
          </p>
          
          <div className="mt-6 pt-4 border-t border-pink-200 flex justify-between items-end">
             <div className="text-xs text-gray-400">{note.date}</div>
             <div className="text-sm md:text-base text-pink-600 font-bold">~ {note.nickname}</div>
          </div>
        </div>

        {/* Spotify Player - Width 100% of the modal */}
        {note.spotifyId ? (
          <div className="mt-2 overflow-hidden rounded-xl shadow-md bg-black w-full max-w-md">
             <iframe 
               style={{ borderRadius: '12px' }} 
               src={`https://open.spotify.com/embed/track/${note.spotifyId}?utm_source=generator&theme=0`} 
               width="100%" 
               height="80" 
               frameBorder="0" 
               allowFullScreen 
               allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
               loading="lazy"
               title="Spotify Player"
             ></iframe>
          </div>
        ) : null}

      </div>
    </div>
  );
}