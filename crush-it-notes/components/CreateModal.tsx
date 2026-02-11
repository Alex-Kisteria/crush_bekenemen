'use client'; // Required for user interaction (inputs)
import React, { useState } from 'react';

export default function CreateModal({ isOpen, onClose, onSubmit }) {
  // State for form fields
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');

  // If modal is closed, don't render anything
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message || !nickname) return; // Simple validation

    // Send data back to the parent component
    onSubmit({ message, nickname });
    
    // Clear form and close
    setMessage('');
    setNickname('');
    onClose();
  };

  return (
    // Overlay: Dimmed background
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      
      {/* Modal Content Box */}
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-bounce-in">
        <h2 className="text-2xl font-bold text-pink-600 mb-4 text-center">Send Love 💌</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Nickname Input */}
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

          {/* Message Input */}
          <div>
            <label className="text-sm text-gray-600 font-bold">Message</label>
            <textarea
              placeholder="Write something sweet..."
              className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 h-24 resize-none text-gray-800"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={80} // Limit text so it fits in the heart
            />
            <p className="text-xs text-right text-gray-400">{message.length}/80</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-bold"
            >
              Post it!
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}