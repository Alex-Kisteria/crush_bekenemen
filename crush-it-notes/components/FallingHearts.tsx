'use client';
import React, { useEffect, useState } from 'react';

export default function FallingHearts() {
  const [hearts, setHearts] = useState<{ id: number; left: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    setHearts(
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 5,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          // We use 'animate-fall' which we defined in globals.css
          className="absolute top-[-10%] text-pink-300 animate-fall opacity-0"
          style={{
            left: `${h.left}%`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            fontSize: `${Math.random() * 10 + 15}px`,
          }}
        >
          ❤
        </div>
      ))}
    </div>
  );
}