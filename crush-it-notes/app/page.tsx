'use client';
import React, { useState } from 'react';
import HeartNote from '../components/HeartNote';
import CreateModal from '../components/CreateModal';
import ViewNoteModal from '../components/ViewNoteModal'; // Import the new modal
import FallingHearts from '../components/FallingHearts';

// Define the shape of a Note
interface Note {
  id: number;
  message: string;
  nickname: string;
  date: string;
  rotation: number;
  spotifyId?: string; // Optional field for the song
}

export default function ValentinesBoard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for the note currently being viewed
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      message: "Happy Valentine's Day! Click me to hear a song.",
      nickname: "Admin",
      date: "2/14/2026",
      rotation: -5,
      spotifyId: "4PTG3Z6ehGkBFwjybzWkR8" // Example Song (Rick Astley - Never Gonna Give You Up)
    }
  ]);

  // Helper for random tilt
  const getRandomRotation = () => Math.floor(Math.random() * 30) - 15;

  // Add Note Logic
  const addNote = (data: { message: string; nickname: string; spotifyId: string }) => {
    const newNote: Note = {
      id: Date.now(),
      message: data.message,
      nickname: data.nickname,
      date: new Date().toLocaleDateString(),
      rotation: getRandomRotation(),
      spotifyId: data.spotifyId // Save the song ID
    };
    setNotes([newNote, ...notes]);
  };

  // Delete Note Logic (Secret PIN)
  const deleteNote = (id: number, pin: string) => {
    const SECRET_PIN = "1234"; // CHANGE THIS PIN
    if (pin === SECRET_PIN) {
      setNotes(notes.filter((n) => n.id !== id));
      alert("Note deleted.");
    } else {
      alert("Incorrect PIN.");
    }
  };

  return (
    <main className="min-h-screen bg-pink-50 relative overflow-x-hidden">
      <FallingHearts />

      <header className="py-8 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-pink-600 drop-shadow-sm">
          Valentine's Wall 💖
        </h1>
        <p className="text-pink-400 mt-2">Spread the love & music anonymously!</p>
      </header>

      <div className="container mx-auto px-4 pb-24 relative z-10">
        {notes.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No notes yet. Be the first!</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {notes.map((note) => (
              <HeartNote 
                key={note.id}
                {...note} // Pass all note properties
                onDelete={deleteNote}
                onClick={() => setSelectedNote(note)} // Open View Modal
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Plus Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-pink-600 text-white w-16 h-16 rounded-full shadow-lg hover:bg-pink-700 hover:scale-110 transition-all duration-300 flex items-center justify-center text-4xl pb-2 z-40"
      >
        +
      </button>

      {/* Modal for Creating Notes */}
      <CreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={addNote} 
      />

      {/* Modal for Viewing/Playing Notes */}
      <ViewNoteModal 
        isOpen={!!selectedNote} 
        onClose={() => setSelectedNote(null)} 
        note={selectedNote} 
      />
    </main>
  );
}