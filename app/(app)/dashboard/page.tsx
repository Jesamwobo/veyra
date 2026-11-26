import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WalletCard from "@/components/WalletCard";
import MissionBoard from "@/components/MissionBoard";
import { fmt, timeAgo } from "@/lib/format";
import type { CatalogItem, HistoryRow, Mission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, wallet, missions, catalog, history] = await Promise.all([
    supabase.from("profiles").select("lifetime_earned, missions_completed").eq("id", user.id).single(),
    supabase.from("wallets").select("id, available_balance").eq("owner_type", "user").eq("owner_id", user.id).single(),
    supabase.from("missions").select("id,title,reward_amount,status,deadline,completed_at").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(40),
    supabase.from("reward_catalog").select("id,title,reward_amount").eq("category", "personal").order("reward_amount"),
    supabase.rpc("my_history", { p_limit: 12 }),
  ]);

  if (!wallet.data) return <p className="text-rose">Your wallet isn’t ready yet. Refresh in a moment.</p>;
  const rows = (history.data ?? []) as HistoryRow[];

  return (
    <>
      <WalletCard
        walletId={wallet.data.id}
        initialBalance={Number(wallet.data.available_balance)}
        lifetime={Number(profile.data?.lifetime_earned ?? 0)}
        completed={profile.data?.missions_completed ?? 0}
      />

      <MissionBoard missions={(missions.data ?? []) as Mission[]} catalog={(catalog.data ?? []) as CatalogItem[]} />

      <section aria-labelledby="hist-h" className="mt-10">
        <h2 id="hist-h" className="font-display text-2xl font-bold tracking-tight">Wallet activity</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-ink/60">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.description ?? "Transaction"}</p>
                  <p className="text-xs text-ink/50">
                    {r.counterparty ? `${r.amount > 0 ? "From" : "To"} @${r.counterparty} · ` : ""}{timeAgo(r.created_at)}
                  </p>
                </div>
                <span className={`font-display text-lg font-bold ${r.amount > 0 ? "text-mint" : "text-ink"}`}>
                  {r.amount > 0 ? "+" : "−"}{fmt(Math.abs(Number(r.amount)))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
