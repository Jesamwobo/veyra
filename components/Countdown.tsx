"use client";
import { useEffect, useState } from "react";
import { fmtDeadline, timeLeft } from "@/lib/time";

/** Shows time left + the exact deadline. Renders after mount to avoid server/browser time mismatch. */
export default function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <span className="invisible">Due soon</span>;
  const t = timeLeft(deadline, now);
  return (
    <span className={t.overdue || t.urgent ? "font-semibold text-rose" : ""}>
      {t.text} <span className="font-normal text-ink/50">({fmtDeadline(deadline)})</span>
    </span>
  );
}
