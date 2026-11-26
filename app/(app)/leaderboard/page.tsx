import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmt } from "@/lib/format";
import { getLevel } from "@/lib/levels";

export const dynamic = "force-dynamic";

const RANK_STYLE = ["bg-coin text-ink", "bg-[#C9CED8] text-ink", "bg-[#D99A6C] text-ink"];

export default async function Leaderboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles")
    .select("id,username,lifetime_earned,missions_completed,reputation_xp,best_streak")
    .order("lifetime_earned", { ascending: false })
    .order("created_at", { ascending: true }).limit(25);

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Top earners</h1>
      <p className="mt-1 text-ink/60">Ranked by VYR earned from completed missions.</p>
      <ol className="mt-4 divide-y divide-line">
        {(data ?? []).map((p, i) => {
          const me = p.id === user?.id;
          return (
            <li key={p.id} className={`flex items-center justify-between gap-3 py-3.5 ${me ? "rounded-lg bg-iris/5 px-3" : ""}`}>
              <span className="flex min-w-0 items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display font-bold ${RANK_STYLE[i] ?? "text-ink/40"}`}>{i + 1}</span>
                <span className="min-w-0">
                  <span className={`block truncate ${me ? "font-semibold" : "font-medium"}`}>@{p.username}{me ? " (you)" : ""}</span>
                  <span className="block text-xs text-ink/55">
                    {getLevel(p.reputation_xp).name}
                    {p.best_streak > 0 ? ` · 🔥 best ${p.best_streak}` : ""}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-right">
                  <span className="block font-display font-bold text-[#B7791A]">{fmt(Number(p.lifetime_earned))}</span>
                  <span className="block text-xs text-ink/50">{p.missions_completed} done</span>
                </span>
                {!me && <Link href={`/send?to=${p.username}`} className="btn-ghost !px-3 !py-1.5">Send</Link>}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
