"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/format";
import Confetti from "@/components/Confetti";

type Match = { username: string; display_name: string };
const QUICK = [10, 25, 50, 100];

export default function SendPage() {
  const supabase = createClient();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [to, setTo] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confetti, setConfetti] = useState(false);
  const stopConfetti = useCallback(() => setConfetti(false), []);
  const idemKey = useRef(crypto.randomUUID());

  async function loadBalance() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMeId(user.id);
    const { data } = await supabase.from("wallets").select("available_balance").eq("owner_type", "user").eq("owner_id", user.id).single();
    if (data) setBalance(Number(data.available_balance));
  }

  useEffect(() => {
    loadBalance();
    const pre = new URLSearchParams(window.location.search).get("to");
    if (pre && /^[a-z0-9_]{3,20}$/.test(pre)) setTo(pre);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (to || q.length < 2 || !meId) { setMatches([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("username, display_name")
        .ilike("username", `${q}%`).neq("id", meId).limit(5);
      setMatches((data ?? []) as Match[]);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [query, to, meId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!to) return;
    setBusy(true); setNotice(null);
    const { error } = await supabase.rpc("transfer_vyr", {
      p_recipient_username: to, p_amount: Number(amount), p_idem: idemKey.current, p_note: note.trim() || null,
    });
    if (error) setNotice({ ok: false, text: error.message });
    else {
      setNotice({ ok: true, text: `Sent ${fmt(Number(amount))} VYR to @${to}.` });
      setConfetti(true);
      idemKey.current = crypto.randomUUID();
      setTo(null); setQuery(""); setAmount(""); setNote("");
      loadBalance(); router.refresh();
    }
    setBusy(false);
  }

  return (
    <>
      {confetti && <Confetti onDone={stopConfetti} />}
      <h1 className="font-display text-3xl font-bold tracking-tight">Send VYR</h1>
      <p className="mt-1 text-ink/60">You have {balance === null ? "…" : fmt(balance)} VYR available.</p>

      <form onSubmit={send} className="mt-6 space-y-4 rounded-xl border border-line bg-white p-4">
        <div>
          <label className="label" htmlFor="to">To</label>
          {to ? (
            <div className="flex items-center justify-between rounded-lg border border-iris bg-iris/5 px-3.5 py-2.5">
              <span className="font-medium">@{to}</span>
              <button type="button" className="text-sm text-ink/60 hover:text-ink" onClick={() => setTo(null)}>Change</button>
            </div>
          ) : (
            <>
              <input id="to" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username" autoComplete="off" />
              {matches.length > 0 && (
                <ul className="mt-1 overflow-hidden rounded-lg border border-line bg-white">
                  {matches.map((m) => (
                    <li key={m.username}>
                      <button type="button" className="flex w-full justify-between px-3.5 py-2.5 text-left text-sm hover:bg-paper" onClick={() => { setTo(m.username); setMatches([]); }}>
                        <span className="font-medium">@{m.username}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <div>
          <label className="label" htmlFor="amt">Amount (VYR)</label>
          <div className="mb-2 flex gap-2">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setAmount(String(q))}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${amount === String(q) ? "border-iris bg-iris/10" : "border-line bg-paper hover:border-iris/50"}`}>
                {q}
              </button>
            ))}
          </div>
          <input id="amt" type="number" inputMode="numeric" min={1} step={1} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="note">Note (optional)</label>
          <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Thanks for reviewing my site" />
        </div>
        {notice && <p role="status" className={`text-sm font-medium ${notice.ok ? "text-mint" : "text-rose"}`}>{notice.text}</p>}
        <button className="btn-primary" disabled={busy || !to || !amount}>Send VYR</button>
      </form>
    </>
  );
}
