"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";

interface ValentinesIntroProps {
  onComplete: () => void;
}

type HeartSpec = {
  angleRad: number;
  delayS: number;
  durationS: number;
  distanceVh: number;
  sizePx: number;
  opacity: number;
};

export default function ValentinesIntro({ onComplete }: ValentinesIntroProps) {
  const [phase, setPhase] = useState<"burst" | "message" | "fadeout">("burst");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const timeoutsRef = useRef<number[]>([]);

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    return () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t);
      timeoutsRef.current = [];
    };
  }, []);

  const finish = (fast = false) => {
    // prevent double-finish
    setPhase("fadeout");

    // allow fade animation to play before unmounting
    const fadeMs = fast ? 450 : 900;

    timeoutsRef.current.push(
      window.setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, fadeMs),
    );
  };

  useEffect(() => {
    if (!isMounted) return;

    // Slower pacing:
    // Burst: ~3.2s
    // Message: ~2.8s
    // Fadeout: ~0.9s
    timeoutsRef.current.push(
      window.setTimeout(() => setPhase("message"), 3200),
    );
    timeoutsRef.current.push(window.setTimeout(() => finish(false), 6000));

    return () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t);
      timeoutsRef.current = [];
    };
  }, [isMounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate the burst specs once (prevents "jumping" if the component re-renders)
  const hearts: HeartSpec[] = useMemo(() => {
    if (!isMounted) return [];

    const count = 56; // a bit fuller, but still clean
    const arr: HeartSpec[] = [];

    for (let i = 0; i < count; i++) {
      const angleRad = (Math.PI * 2 * i) / count;

      // slower, more staggered, less extreme travel
      const delayS = Math.random() * 0.9; // 0–0.9s
      const durationS = 2.8 + Math.random() * 1.2; // 2.8–4.0s
      const distanceVh = 40 + Math.random() * 28; // 40–68vh (less "instant offscreen")
      const sizePx = 16 + Math.random() * 22; // 16–38px
      const opacity = 0.65 + Math.random() * 0.25; // 0.65–0.90

      arr.push({ angleRad, delayS, durationS, distanceVh, sizePx, opacity });
    }

    return arr;
  }, [isMounted]);

  if (!isMounted || !isVisible) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-[100] overflow-hidden",
        "flex items-center justify-center p-6",
        "transition-opacity duration-700",
        phase === "fadeout" ? "opacity-0" : "opacity-100",
      ].join(" ")}
      onMouseDown={() => finish(true)}
      role="presentation"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-pink-100 to-red-100" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.10),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(251,113,133,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-white/20" />

      {/* Heart burst */}
      {phase === "burst" && (
        <div className="absolute inset-0">
          {hearts.map((h, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={
                {
                  animation: `heartBurst ${h.durationS}s cubic-bezier(.16,1,.3,1) ${h.delayS}s forwards`,
                  "--angle": `${h.angleRad}rad`,
                  "--distance": `${h.distanceVh}vh`,
                  opacity: h.opacity,
                } as React.CSSProperties
              }
            >
              <Heart
                size={h.sizePx}
                className="text-rose-500 fill-rose-400"
                // no glow / highlight (plain look)
              />
            </div>
          ))}
        </div>
      )}

      {/* Center "card" message (sticky-ish) */}
      <div
        className={[
          "relative z-10 w-full max-w-2xl",
          "transition-all duration-700 ease-out",
          phase === "message"
            ? "opacity-100 translate-y-0 scale-100"
            : phase === "fadeout"
              ? "opacity-0 translate-y-2 scale-[0.99]"
              : "opacity-0 translate-y-3 scale-[0.98]",
        ].join(" ")}
      >
        <div className="relative rounded-[28px] border border-rose-200 bg-white/70 backdrop-blur-md shadow-2xl overflow-hidden">
          {/* subtle tape */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-10 bg-rose-200/35 border border-rose-200/50 rounded-b-2xl" />

          <div className="px-8 pt-10 pb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center">
                <Heart className="text-rose-600 fill-rose-500" size={30} />
              </div>
            </div>

            <h1
              className="text-4xl sm:text-6xl font-bold text-rose-900 leading-tight"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Happy Valentine&apos;s Day
            </h1>

            <p
              className="mt-3 text-lg sm:text-2xl text-rose-800/90"
              style={{ fontFamily: "'Indie Flower', cursive" }}
            >
              Leave sweet notes. Add a song. Spread the love.
            </p>
          </div>

          <div className="h-2 bg-gradient-to-b from-transparent to-rose-900/5" />
        </div>
      </div>
    </div>
  );
}
