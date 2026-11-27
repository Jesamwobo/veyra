"use client";
import { useEffect, useState } from "react";
import { quickDeadlines, toLocalInput } from "@/lib/time";

export default function DeadlinePicker({
  id, value, onChange,
}: { id: string; value: string; onChange: (v: string) => void }) {
  const [chips, setChips] = useState<{ label: string; date: Date }[]>([]);
  const [min, setMin] = useState<string | undefined>(undefined);

  useEffect(() => {
    setChips(quickDeadlines());
    setMin(toLocalInput(new Date(Date.now() + 5 * 60000)));
  }, []);

  return (
    <div>
      <label className="label" htmlFor={id}>Deadline (date and time)</label>
      <div className="mb-2 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c.label} type="button" onClick={() => onChange(toLocalInput(c.date))}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm transition hover:border-iris">
            {c.label}
          </button>
        ))}
      </div>
      <input id={id} type="datetime-local" className="input" value={value} min={min}
        onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
