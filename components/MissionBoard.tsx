"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CatalogItem, Stats, Task } from "@/lib/types";
import { fmt } from "@/lib/format";
import Countdown from "@/components/Countdown";
import DeadlinePicker from "@/components/DeadlinePicker";
import MemberPicker from "@/components/MemberPicker";
import ProofForm from "@/components/ProofForm";

const IDEAS = [
  { t: "Read 5 pages", r: 10 },
  { t: "Read 20 pages", r: 25 },
  { t: "Finish one lesson", r: 50 },
  { t: "Do a practical exercise", r: 100 },
  { t: "Hit a project milestone", r: 200 },
];

const ENDED_LABEL: Record<string, string> = {
  completed: "Verified", expired: "Expired", cancelled: "Dropped",
};

export default function MissionBoard({
  missions, catalog, stats,
}: { missions: Task[]; catalog: CatalogItem[]; stats: Stats | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [catalogId, setCatalogId] = useState(catalog[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");
  const [verifier, setVerifier] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const active = missions.filter((m) => m.status === "open" || m.status === "submitted");
  const ended = missions.filter((m) => ["completed", "expired", "cancelled"].includes(m.status)).slice(0, 6);
  const room = stats ? Math.max(0, stats.daily_cap - stats.used_today) : null;

  function pickIdea(idea: { t: string; r: number }) {
    setTitle(idea.t);
    const match = catalog.find((c) => c.reward_amount === idea.r);
    if (match) setCatalogId(match.id);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!verifier) { setNotice({ ok: false, text: "Choose a member to verify this mission." }); return; }
    if (!deadline) { setNotice({ ok: false, text: "Set a deadline." }); return; }
    setBusy("create");
    const { error } = await supabase.rpc("create_mission", {
      p_title: title.trim(),
      p_catalog_id: catalogId,
      p_deadline: new Date(deadline).toISOString(),
      p_verifier_username: verifier,
    });
    if (error) setNotice({ ok: false, text: error.message });
    else {
      setTitle(""); setDeadline("");
      setNotice({ ok: true, text: "Mission added. Finish it before the deadline, then submit proof." });
      router.refresh();
    }
    setBusy(null);
  }

  async function submit(m: Task, text: string, link: string) {
    setBusy(m.id); setNotice(null);
    const { error } = await supabase.rpc("submit_mission", { p_mission_id: m.id, p_text: text, p_url: link.trim() || null });
    if (error) setNotice({ ok: false, text: error.message });
    else {
      setSubmittingId(null);
      setNotice({ ok: true, text: `Submitted. @${m.verifier_username} will verify it and your VYR is released when they approve.` });
      router.refresh();
    }
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
      <p className="mt-1 text-sm text-ink/60">
        A friend you choose verifies your work before any VYR is released.
        {room !== null && ` You can still earn up to ${fmt(room)} VYR today.`}
      </p>

      <form onSubmit={create} className="mt-4 space-y-4 rounded-xl border border-line bg-white p-4">
        <div>
          <p className="label">Quick ideas</p>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <button key={i.t} type="button" onClick={() => pickIdea(i)}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm transition hover:border-iris">
                {i.t} <span className="font-semibold text-[#B7791A]">+{i.r}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="m-title">What will you do?</label>
          <input id="m-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Read chapter 3 of my design book" maxLength={120} required />
        </div>
        <div>
          <label className="label" htmlFor="m-diff">Difficulty</label>
          <select id="m-diff" className="input" value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.reward_amount} VYR)</option>)}
          </select>
        </div>
        <DeadlinePicker id="m-deadline" value={deadline} onChange={setDeadline} />
        <MemberPicker id="m-verifier" label="Who will verify it?" value={verifier} onChange={setVerifier} />
        <button className="btn-primary" disabled={busy === "create" || !title.trim()}>Add mission</button>
      </form>

      {notice && (
        <p role="status" className={`mt-3 text-sm font-medium ${notice.ok ? "text-mint" : "text-rose"}`}>{notice.text}</p>
      )}

      {active.length === 0 ? (
        <p className="mt-6 text-ink/60">No active missions. Pick a quick idea above to get started.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {active.map((m) => (
            <li key={m.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-ink/55">
                    <span className="font-semibold text-[#B7791A]">+{fmt(m.reward_amount)} VYR</span>
                    {" · "}<Countdown deadline={m.deadline} />
                  </p>
                  <p className="text-sm text-ink/55">Verifier: @{m.verifier_username}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {m.status === "open" && (
                    <button className="btn-mint" disabled={busy === m.id}
                      onClick={() => setSubmittingId(submittingId === m.id ? null : m.id)}>
                      Submit proof
                    </button>
                  )}
                  <button className="btn-ghost" disabled={busy === m.id} onClick={() => drop(m.id)}>
                    {m.status === "submitted" ? "Withdraw" : "Drop"}
                  </button>
                </div>
              </div>

              {m.status === "open" && m.rejection_count > 0 && m.review_note && (
                <p className="mt-2 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">
                  @{m.verifier_username} asked for changes: {m.review_note}
                </p>
              )}
              {m.status === "submitted" && (
                <p className="mt-2 rounded-lg bg-iris/10 px-3 py-2 text-sm text-iris">
                  Waiting for @{m.verifier_username} to verify.
                </p>
              )}
              {m.status === "open" && submittingId === m.id && (
                <ProofForm busy={busy === m.id} cta="Send for verification" onSubmit={(t, l) => submit(m, t, l)} />
              )}
            </li>
          ))}
        </ul>
      )}

      {ended.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink/60">Recently ended</h3>
          <ul className="mt-2 space-y-1 text-sm text-ink/70">
            {ended.map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span className="truncate">{m.title}</span>
                <span className={m.status === "completed" ? "shrink-0 text-mint" : "shrink-0 text-ink/45"}>
                  {m.status === "completed" ? `+${fmt(m.reward_amount)} · ` : ""}{ENDED_LABEL[m.status] ?? m.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
