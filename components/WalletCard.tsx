"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/format";

function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      fromRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return shown;
}

export default function WalletCard({
  walletId, initialBalance, lifetime,
}: { walletId: string; initialBalance: number; lifetime: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  const prev = useRef(initialBalance);
  const shown = useCountUp(balance);

  useEffect(() => setBalance(initialBalance), [initialBalance]);

  useEffect(() => {
    const diff = balance - prev.current;
    prev.current = balance;
    if (diff !== 0) setDelta({ v: diff, k: Date.now() });
  }, [balance]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wallet-${walletId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `id=eq.${walletId}` },
        (payload) => setBalance(Number((payload.new as { available_balance: number }).available_balance))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walletId]);

  return (
    <section className="relative rounded-2xl bg-ink p-6 text-white" aria-label="Wallet">
      <div className="flex items-center gap-4">
        <span
          key={`coin-${delta?.k ?? 0}`}
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-coin font-display text-3xl font-bold text-ink shadow-[inset_0_-4px_0_rgba(0,0,0,.15)] ${delta && delta.v > 0 ? "coin-spin" : ""}`}
        >
          V
        </span>
        <div className="relative">
          <p className="text-sm text-white/60">Available balance</p>
          <p className="font-display text-5xl font-bold leading-none tracking-tight">
            {fmt(shown)} <span className="text-2xl font-semibold text-coin">VYR</span>
          </p>
          {delta && (
            <span
              key={delta.k}
              className={`float-up absolute -top-2 right-0 font-display text-2xl font-bold ${delta.v > 0 ? "text-coin" : "text-white/70"}`}
            >
              {delta.v > 0 ? "+" : "−"}{fmt(Math.abs(delta.v))}
            </span>
          )}
        </div>
      </div>
      <p className="mt-5 text-sm text-white/60">{fmt(lifetime)} VYR earned from missions all-time</p>
    </section>
  );
}
