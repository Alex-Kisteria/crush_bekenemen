"use client";

import { useMemo } from "react";

export type NoteBurst = { xPct: number; yPct: number; key: number } | null;

export default function NoteHeartsBurst({ burst }: { burst: NoteBurst }) {
  const pieces = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  if (!burst) return null;

  return (
    <>
      <div
        key={burst.key}
        className="absolute pointer-events-none z-40"
        style={{
          left: `${burst.xPct}%`,
          top: `${burst.yPct}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {pieces.map((i) => {
          const angle = (Math.PI * 2 * i) / pieces.length;
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          const distance = 40 + (i % 3) * 10;

          return (
            <div
              key={i}
              className="nhb-piece absolute"
              style={{
                left: 0,
                top: 0,
                ["--dx" as any]: dx,
                ["--dy" as any]: dy,
                ["--dist" as any]: `${distance}px`,
                animationDelay: `${i * 20}ms`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff6b9d">
                <path d="M12 4c-1.5-3-5-4-8-2s-4 5-2 8c1 1.5 6 6 10 10 4-4 9-8.5 10-10 2-3 1-6-2-8s-6.5-1-8 2z" />
              </svg>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .nhb-piece {
          transform: translate(0, 0) scale(0.9);
          opacity: 0;
          animation: nhb-pop 700ms ease-out forwards;
        }

        @keyframes nhb-pop {
          0% {
            transform: translate(0, 0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(
                calc(var(--dx) * var(--dist)),
                calc(var(--dy) * var(--dist) * -1)
              )
              scale(0.2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
