"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/format";

export default function WalletCard({
  walletId, initialBalance, lifetime, completed,
}: { walletId: string; initialBalance: number; lifetime: number; completed: number }) {
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => setBalance(initialBalance), [initialBalance]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wallet-${walletId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `id=eq.${walletId}` },
        (payload) => setBalance(Number((payload.new as { available_balance: number }).available_balance)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walletId]);

  return (
    <section className="rounded-2xl bg-ink p-6 text-white" aria-label="Wallet">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-coin font-display text-3xl font-bold text-ink shadow-[inset_0_-4px_0_rgba(0,0,0,.15)]">V</span>
        <div>
          <p className="text-sm text-white/60">Available balance</p>
          <p className="font-display text-5xl font-bold leading-none tracking-tight">
            {fmt(balance)} <span className="text-2xl font-semibold text-coin">VYR</span>
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm text-white/60">
        {fmt(lifetime)} earned from missions · {completed} {completed === 1 ? "mission" : "missions"} done
      </p>
    </section>
  );
}
