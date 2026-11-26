"use client";
import { useEffect, useMemo } from "react";

const COLORS = ["#F4B63C", "#4B34E8", "#17996A", "#C93C4B", "#15171F"];

export default function Confetti({ onDone }: { onDone: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        dur: 1.1 + Math.random() * 0.9,
        drift: (Math.random() - 0.5) * 160,
        rot: Math.random() * 720,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    []
  );

  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--drift": `${p.drift}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
