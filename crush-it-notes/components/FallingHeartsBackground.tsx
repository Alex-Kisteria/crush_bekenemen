"use client";

import { useEffect, useState } from "react";

type HeartParticle = {
  id: number;
  leftPct: number;
  sizePx: number;
  fallDurationS: number;
  fallDelayS: number;
  swayDurationS: number;
  swayDelayS: number;
  swayPx: number;
  opacity: number;
  rotateDeg: number;
};

function generateParticles(count: number): HeartParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const sizePx = 8 + Math.random() * 10; // 8..18
    return {
      id: i,
      leftPct: Math.random() * 100,
      sizePx,
      fallDurationS: 6 + Math.random() * 5, // 6..11
      fallDelayS: Math.random() * 2, // 0..2
      swayDurationS: 2.5 + Math.random() * 2.5, // 2.5..5
      swayDelayS: Math.random() * 1.5,
      swayPx: 10 + Math.random() * 18, // 10..28
      opacity: 0.15 + Math.random() * 0.25,
      rotateDeg: Math.random() * 25 - 12.5,
    };
  });
}

export default function FallingHeartsBackground() {
  const [particles, setParticles] = useState<HeartParticle[] | null>(null);

  useEffect(() => {
    // Generate ONLY on the client after mount to avoid SSR/client mismatch.
    setParticles(generateParticles(34));
  }, []);

  // Important: render nothing on SSR and on the first client render (pre-effect),
  // so hydration matches.
  if (!particles) return null;

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {particles.map((p) => (
          <div
            key={p.id}
            className="fh-particle absolute -top-10"
            style={{
              left: `${p.leftPct}%`,
              opacity: p.opacity,
              width: `${p.sizePx}px`,
              height: `${p.sizePx}px`,
              transform: `rotate(${p.rotateDeg}deg)`,
              animation: `fh-fall ${p.fallDurationS}s linear ${p.fallDelayS}s infinite, fh-sway ${p.swayDurationS}s ease-in-out ${p.swayDelayS}s infinite`,
              ["--fh-sway" as any]: `${p.swayPx}px`,
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#ff6b9d">
              <path d="M12 4c-1.5-3-5-4-8-2s-4 5-2 8c1 1.5 6 6 10 10 4-4 9-8.5 10-10 2-3 1-6-2-8s-6.5-1-8 2z" />
            </svg>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fh-fall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }

        @keyframes fh-sway {
          0%,
          100% {
            margin-left: calc(var(--fh-sway) * -0.5);
          }
          50% {
            margin-left: var(--fh-sway);
          }
        }
      `}</style>
    </>
  );
}
