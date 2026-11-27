"use client";
import { useId, useState } from "react";

export default function ProofForm({
  busy, cta, onSubmit,
}: { busy: boolean; cta: string; onSubmit: (text: string, link: string) => void }) {
  const uid = useId();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-paper p-3">
      <div>
        <label className="label" htmlFor={`${uid}-t`}>What did you do?</label>
        <textarea id={`${uid}-t`} className="input min-h-[84px]" value={text} maxLength={1000}
          onChange={(e) => setText(e.target.value)} placeholder="Read chapters 3 and 4. Key idea: ..." />
      </div>
      <div>
        <label className="label" htmlFor={`${uid}-l`}>Link as proof (optional)</label>
        <input id={`${uid}-l`} className="input" value={link} onChange={(e) => setLink(e.target.value)}
          placeholder="https://" inputMode="url" />
      </div>
      <button type="button" className="btn-primary" disabled={busy || text.trim().length < 10}
        onClick={() => onSubmit(text, link)}>
        {cta}
      </button>
      {text.trim().length < 10 && <p className="text-xs text-ink/50">Write at least 10 characters.</p>}
    </div>
  );
}
