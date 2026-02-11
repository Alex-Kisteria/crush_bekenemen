'use client';
import React, { useState } from 'react';
import HeartNote from '../components/HeartNote';
import CreateModal from '../components/CreateModal';
// 1. IMPORT THE COMPONENT
import FallingHearts from '../components/FallingHearts'; 

interface Note {
  id: number;
  message: string;
  nickname: string;
  date: string;
}

interface NoteInput {
  message: string;
  nickname: string;
}

export default function ValentinesBoard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      message: "Happy Valentine's Day to everyone!",
      nickname: "Admin",
      date: "2/14/2026" // Fixed static date to prevent hydration error
    }
  ]);

  const addNote = ({ message, nickname }: NoteInput) => {
    const newNote: Note = {
      id: Date.now(),
      message,
      nickname,
      date: new Date().toLocaleDateString()
    };
    setNotes([newNote, ...notes]);
  };

  return (
    <main className="min-h-screen bg-pink-50 relative overflow-x-hidden">
      
      {/* 2. USE THE COMPONENT HERE */}
      {/* This renders the background behind everything else */}
      <FallingHearts />

      <header className="py-8 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-pink-600 drop-shadow-sm">
          Valentine's Wall 💖
        </h1>
        <p className="text-pink-400 mt-2">Spread the love anonymously!</p>
      </header>

      <div className="container mx-auto px-4 pb-24 relative z-10">
        {notes.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No notes yet. Be the first!</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {notes.map((note) => (
              <HeartNote 
                key={note.id}
                message={note.message}
                nickname={note.nickname}
                date={note.date}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-pink-600 text-white w-16 h-16 rounded-full shadow-lg hover:bg-pink-700 hover:scale-110 transition-all duration-300 flex items-center justify-center text-4xl pb-2 z-40"
      >
        +
      </button>

      <CreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={addNote} 
      />
    </main>
  );
}