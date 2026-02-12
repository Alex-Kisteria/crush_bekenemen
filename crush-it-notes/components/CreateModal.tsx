'use client';
import React, { useState, FormEvent } from 'react';
import { searchSpotifyTracks } from '../app/actions';

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
    // OUTSIDE OVERLAY
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      
      {/* MODAL CONTAINER */}
      {/* Added 'mx-2' for that mini margin on the sides */}
      {/* Changed 'max-h-[90vh]' to ensure it fits on screen without being too tall */}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl flex flex-col md:flex-row max-h-[85vh] md:max-h-[90vh] overflow-hidden mx-4">
        
        {/* --- LEFT SIDE: FORM --- */}
        {/* Changed padding from p-6 to p-4 on mobile to save space */}
        <div className="p-4 md:p-6 flex-1 flex flex-col gap-3 md:gap-4 overflow-y-auto">
          <h2 className="text-xl md:text-2xl font-bold text-pink-600">Write a Note 💌</h2>
          
          <div>
            <label className="text-sm text-gray-600 font-bold">Nickname</label>
            <input
              type="text"
              placeholder="Secret Admirer"
              className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 text-sm"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 font-bold">Message</label>
            <textarea
              placeholder="Spill the tea or share the love..."
              className="w-full p-3 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 h-24 md:h-32 resize-none text-gray-800 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160} 
            />
            <p className="text-xs text-right text-gray-400">{message.length}/160</p>
          </div>

          {/* Selected Song Preview */}
          {selectedSong && (
            <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-200">
              <img src={selectedSong.albumArt} alt="Art" className="w-10 h-10 rounded shadow-sm" />
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-xs text-green-800 truncate">{selectedSong.name}</p>
                <p className="text-[10px] text-green-600 truncate">{selectedSong.artist}</p>
              </div>
              <button onClick={() => setSelectedSong(null)} className="p-2 text-red-500 font-bold hover:bg-red-50 rounded">✕</button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-auto pt-2">
            <button onClick={onClose} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-sm font-bold">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-bold shadow-md transition-colors text-sm">Post it!</button>
          </div>
        </div>

        {/* --- RIGHT SIDE: SPOTIFY SEARCH --- */}
        {/* Adjusted padding and height for mobile */}
        <div className="flex-1 bg-gray-50 md:bg-white p-4 md:p-6 md:border-l border-t md:border-t-0 border-gray-100 flex flex-col min-h-[250px] md:min-h-0">
          <h2 className="text-lg md:text-xl font-bold text-green-600 mb-3 flex items-center gap-2">
            <span>Add a Song</span>
            <span className="text-xl">🎵</span>
          </h2>
          
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              placeholder="Search Spotify..." 
              className="flex-1 p-2 border border-gray-300 rounded-lg text-black text-sm focus:outline-none focus:border-green-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="bg-green-500 text-white px-3 rounded-lg hover:bg-green-600 transition-colors">🔍</button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isSearching && <p className="text-gray-400 text-center text-sm py-4">Searching...</p>}
            
            {!isSearching && results.length === 0 && query && (
               <p className="text-gray-400 text-center text-sm py-4">No songs found.</p>
            )}

            {results.map((track) => (
              <div 
                key={track.id} 
                onClick={() => setSelectedSong(track)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedSong?.id === track.id ? 'bg-green-100 border-green-500 border' : 'bg-white hover:bg-green-50 border border-gray-100'}`}
              >
                <img src={track.albumArt} alt="album" className="w-10 h-10 rounded shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs md:text-sm text-gray-800 truncate">{track.name}</p>
                  <p className="text-[10px] md:text-xs text-gray-500 truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}