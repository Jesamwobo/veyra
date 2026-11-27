"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Match = { username: string };

export default function MemberPicker({
  id, label, value, onChange,
}: { id: string; label: string; value: string | null; onChange: (u: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (value || q.length < 2 || !meId) { setMatches([]); return; }
    const t = setTimeout(async () => {
      const { data } = await createClient().from("profiles").select("username")
        .ilike("username", `${q}%`).neq("id", meId).limit(5);
      setMatches((data ?? []) as Match[]);
    }, 250);
    return () => clearTimeout(t);
  }, [query, value, meId]);

  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-iris bg-iris/5 px-3.5 py-2.5">
          <span className="font-medium">@{value}</span>
          <button type="button" className="text-sm text-ink/60 hover:text-ink" onClick={() => { onChange(null); setQuery(""); }}>Change</button>
        </div>
      ) : (
        <>
          <input id={id} className="input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username" autoComplete="off" />
          {matches.length > 0 && (
            <ul className="mt-1 overflow-hidden rounded-lg border border-line bg-white">
              {matches.map((m) => (
                <li key={m.username}>
                  <button type="button" className="block w-full px-3.5 py-2.5 text-left text-sm font-medium hover:bg-paper"
                    onClick={() => { onChange(m.username); setMatches([]); }}>
                    @{m.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
