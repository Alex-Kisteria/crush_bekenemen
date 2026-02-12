'use client';
import React, { useState } from 'react';
import HeartNote from '../components/HeartNote';
import CreateModal from '../components/CreateModal';
import ViewNoteModal from '../components/ViewNoteModal';
import FallingHearts from '../components/FallingHearts';

interface Note {
  id: number;
  message: string;
  nickname: string;
  date: string;
  rotation: number;
  spotifyId?: string;
}

export default function ValentinesBoard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      message: "Happy Valentine's Day! Here is a longer message to test the new 160 character limit. It's basically the length of an old school SMS message!",
      nickname: "Admin",
      date: "2/14/2026",
      rotation: -5,
      spotifyId: "4PTG3Z6ehGkBFwjybzWkR8"
    }
  ]);

  const getRandomRotation = () => Math.floor(Math.random() * 30) - 15;

  const addNote = (data: { message: string; nickname: string; spotifyId: string }) => {
    const newNote: Note = {
      id: Date.now(),
      message: data.message,
      nickname: data.nickname,
      date: new Date().toLocaleDateString(),
      rotation: getRandomRotation(),
      spotifyId: data.spotifyId
    };
    setNotes([newNote, ...notes]);
  };

  return (
    <main className="min-h-screen bg-pink-50 relative overflow-x-hidden">
      <FallingHearts />

      <header className="py-8 text-center relative z-10 px-4">
        <h1 className="text-3xl md:text-5xl font-extrabold text-pink-600 drop-shadow-sm">
          Valentine's Wall 💖
        </h1>
        <p className="text-pink-400 mt-2 text-sm md:text-base">Spread the love & music anonymously!</p>
      </header>

      {/* --- MAIN CONTAINER --- */}
      {/* Added 'px-6' (mobile) and 'md:px-12' (desktop) to keep hearts away from edges */}
      <div className="container mx-auto px-6 md:px-12 pb-24 relative z-10">
        {notes.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No notes yet. Be the first!</p>
        ) : (
          /* THE GRID */
          /* gap-x-4 adds space between columns so hearts don't touch */
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 md:flex md:flex-wrap md:justify-center md:gap-10 justify-items-center">
            {notes.map((note) => (
              <HeartNote 
                key={note.id}
                {...note}
                onClick={() => setSelectedNote(note)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-pink-600 text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:bg-pink-700 hover:scale-110 transition-all duration-300 flex items-center justify-center text-3xl md:text-4xl pb-1 z-40"
      >
        +
      </button>

      <CreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={addNote} 
      />

      <ViewNoteModal 
        isOpen={!!selectedNote} 
        onClose={() => setSelectedNote(null)} 
        note={selectedNote} 
      />
    </main>
  );
}