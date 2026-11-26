"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CatalogItem, Mission } from "@/lib/types";
import { fmt } from "@/lib/format";

export default function MissionBoard({ missions, catalog }: { missions: Mission[]; catalog: CatalogItem[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [catalogId, setCatalogId] = useState(catalog[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const open = missions.filter((m) => m.status === "open");
  const done = missions.filter((m) => m.status === "completed").slice(0, 5);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create"); setNotice(null);
    const { error } = await supabase.rpc("create_mission", {
      p_title: title.trim(),
      p_catalog_id: catalogId,
      p_deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
    });
    if (error) setNotice({ ok: false, text: error.message });
    else { setTitle(""); setDeadline(""); router.refresh(); }
    setBusy(null);
  }

  async function complete(id: string) {
    setBusy(id); setNotice(null);
    const { data, error } = await supabase.rpc("complete_mission", { p_mission_id: id });
    if (error) setNotice({ ok: false, text: error.message });
    else { setNotice({ ok: true, text: `Mission complete. You earned ${fmt(Number(data))} VYR.` }); router.refresh(); }
    setBusy(null);
  }

  async function drop(id: string) {
    setBusy(id); setNotice(null);
    const { error } = await supabase.rpc("cancel_mission", { p_mission_id: id });
    if (error) setNotice({ ok: false, text: error.message });
    else router.refresh();
    setBusy(null);
  }

  return (
    <section aria-labelledby="missions-h" className="mt-8">
      <h2 id="missions-h" className="font-display text-2xl font-bold tracking-tight">Your missions</h2>

      <form onSubmit={create} className="mt-4 space-y-3 rounded-xl border border-line bg-white p-4">
        <div>
          <label className="label" htmlFor="m-title">What will you do?</label>
          <input id="m-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read chapter 3 of my design book" maxLength={120} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="m-diff">Difficulty</label>
            <select id="m-diff" className="input" value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
              {catalog.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.reward_amount} VYR)</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m-date">Deadline (optional)</label>
            <input id="m-date" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" disabled={busy === "create" || !title.trim()}>Add mission</button>
      </form>

      {notice && (
        <p role="status" className={`mt-3 text-sm ${notice.ok ? "text-mint" : "text-rose"}`}>{notice.text}</p>
      )}

      {open.length === 0 ? (
        <p className="mt-6 text-ink/60">No open missions. Add one above and earn VYR when you finish it.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {open.map((m) => {
            const overdue = m.deadline && new Date(m.deadline).getTime() < Date.now();
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.title}</p>
                  <p className="text-sm text-ink/55">
                    <span className="font-semibold text-[#B7791A]">+{fmt(m.reward_amount)} VYR</span>
                    {m.deadline && (
                      <span className={overdue ? " text-rose" : ""}>
                        {overdue ? " · Overdue" : ` · Due ${new Date(m.deadline).toLocaleDateString()}`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!overdue && <button className="btn-mint" disabled={busy === m.id} onClick={() => complete(m.id)}>Done</button>}
                  <button className="btn-ghost" disabled={busy === m.id} onClick={() => drop(m.id)}>Drop</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink/60">Recently completed</h3>
          <ul className="mt-2 space-y-1 text-sm text-ink/70">
            {done.map((m) => <li key={m.id} className="flex justify-between"><span className="truncate">{m.title}</span><span className="text-mint">+{fmt(m.reward_amount)}</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
