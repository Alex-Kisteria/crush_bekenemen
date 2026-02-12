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
      <div 
        className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl relative animate-bounce-in text-center"
        onClick={(e) => e.stopPropagation()} 
      >
        <button onClick={onClose} className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        
        <p className="text-xs text-pink-400 font-bold uppercase tracking-widest mb-4">Valentine's Message</p>
        
        {/* The Card View */}
        <div className="bg-pink-50 p-8 rounded-xl mb-6 transform rotate-1 border border-pink-100 shadow-inner">
          <p className="text-xl text-gray-800 font-medium leading-relaxed font-serif">"{note.message}"</p>
          <div className="mt-6 pt-4 border-t border-pink-200">
             <div className="text-sm text-pink-600 font-bold">~ {note.nickname}</div>
             <div className="text-xs text-gray-400">{note.date}</div>
          </div>
        </div>

        {/* Spotify Player */}
        {note.spotifyId ? (
          <div className="mt-4 overflow-hidden rounded-xl shadow-md bg-black">
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
        ) : (
          <p className="text-xs text-gray-400 italic mt-2">No song attached to this note.</p>
        )}

      </div>
    </div>
  );
}