import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WalletCard from "@/components/WalletCard";
import MissionBoard from "@/components/MissionBoard";
import ProgressPanel from "@/components/ProgressPanel";
import InviteButton from "@/components/InviteButton";
import { fmt, timeAgo } from "@/lib/format";
import type { CatalogItem, HistoryRow, Stats, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("process_due");

  const [wallet, tasks, catalog, history, statsRes] = await Promise.all([
    supabase.from("wallets").select("id, available_balance").eq("owner_type", "user").eq("owner_id", user.id).single(),
    supabase.rpc("my_tasks"),
    supabase.from("reward_catalog").select("id,title,reward_amount").eq("category", "personal").order("reward_amount"),
    supabase.rpc("my_history", { p_limit: 12 }),
    supabase.rpc("my_stats"),
  ]);

  if (!wallet.data) return <p className="text-rose">Your wallet isn’t ready yet. Refresh in a moment.</p>;
  const rows = (history.data ?? []) as HistoryRow[];
  const stats = ((statsRes.data ?? []) as Stats[])[0] ?? null;
  const showStart = stats !== null && (stats.missions_completed === 0 || stats.transfers_sent === 0);

  return (
    <>
      <WalletCard
        walletId={wallet.data.id}
        initialBalance={Number(wallet.data.available_balance)}
        lifetime={Number(stats?.lifetime_earned ?? 0)}
      />

      {stats && <ProgressPanel stats={stats} />}

      {showStart && stats && (
        <section aria-labelledby="start-h" className="mt-4 rounded-2xl border border-iris/30 bg-iris/5 p-5">
          <h2 id="start-h" className="font-display text-xl font-bold">Get started</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span aria-hidden="true">{stats.missions_completed > 0 ? "✅" : "⬜"}</span>
              <span className={stats.missions_completed > 0 ? "text-ink/50 line-through" : ""}>Complete your first mission</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">{stats.transfers_sent > 0 ? "✅" : "⬜"}</span>
              <span className={stats.transfers_sent > 0 ? "text-ink/50 line-through" : ""}>
                {stats.transfers_sent > 0 ? "Send VYR to a friend" : <Link href="/send" className="font-semibold text-iris hover:underline">Send VYR to a friend</Link>}
              </span>
            </li>
          </ul>
          <div className="mt-4"><InviteButton /></div>
        </section>
      )}

      <MissionBoard
        missions={((tasks.data ?? []) as Task[]).filter((t) => t.mission_type === "personal" && t.is_creator)}
        catalog={(catalog.data ?? []) as CatalogItem[]}
        stats={stats}
      />

      {!showStart && (
        <div className="mt-8 flex items-center justify-between rounded-xl border border-line bg-white p-4">
          <p className="text-sm text-ink/70">Veyra is better with friends.</p>
          <InviteButton />
        </div>
      )}

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
