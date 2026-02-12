'use client';
import React, { useState, FormEvent } from 'react';
import { searchSpotifyTracks } from '../app/actions'; // Imports the server action we made

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message: string; nickname: string; spotifyId: string }) => void;
}

export default function CreateModal({ isOpen, onClose, onSubmit }: CreateModalProps) {
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  
  // Spotify State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      const tracks = await searchSpotifyTracks(query);
      setResults(tracks);
    } catch (error) {
      console.error("Search failed", error);
    }
    setIsSearching(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message || !nickname) return;

    onSubmit({ 
      message, 
      nickname, 
      spotifyId: selectedSong ? selectedSong.id : '' 
    });
    
    // Reset Form
    setMessage('');
    setNickname('');
    setQuery('');
    setResults([]);
    setSelectedSong(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl animate-bounce-in flex flex-col md:flex-row gap-6 h-[500px]">
        
        {/* LEFT SIDE: Text Inputs */}
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-pink-600">Write a Note 💌</h2>
          
          <div>
            <label className="text-sm text-gray-600 font-bold">Nickname</label>
            <input
              type="text"
              placeholder="Secret Admirer"
              className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={15}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 font-bold">Message</label>
            <textarea
              placeholder="Write something sweet..."
              className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 h-24 resize-none text-gray-800"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={80}
            />
          </div>

          {/* Selected Song Preview */}
          {selectedSong && (
            <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-200 mt-auto">
              <img src={selectedSong.albumArt} alt="Art" className="w-8 h-8 rounded" />
              <div className="text-xs text-green-800 overflow-hidden">
                <p className="font-bold truncate">{selectedSong.name}</p>
                <p className="truncate">{selectedSong.artist}</p>
              </div>
              <button onClick={() => setSelectedSong(null)} className="ml-auto text-red-500 font-bold px-2">✕</button>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button onClick={onClose} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-bold">Post it!</button>
          </div>
        </div>

        {/* RIGHT SIDE: Spotify Search */}
        <div className="flex-1 border-l border-gray-100 pl-0 md:pl-6 flex flex-col">
          <h2 className="text-xl font-bold text-green-600 mb-4">Add a Song 🎵</h2>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Search Song..." 
              className="flex-1 p-2 border border-gray-300 rounded-lg text-black text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="bg-green-500 text-white px-3 rounded-lg hover:bg-green-600">🔍</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isSearching && <p className="text-gray-400 text-center text-sm">Searching Spotify...</p>}
            
            {results.map((track) => (
              <div 
                key={track.id} 
                onClick={() => setSelectedSong(track)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedSong?.id === track.id ? 'bg-green-100 border-green-500 border' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <img src={track.albumArt} alt="album" className="w-10 h-10 rounded shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">{track.name}</p>
                  <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}