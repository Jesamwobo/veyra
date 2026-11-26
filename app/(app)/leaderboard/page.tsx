import { createClient } from "@/lib/supabase/server";
import { fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles")
    .select("id,username,lifetime_earned,missions_completed")
    .order("lifetime_earned", { ascending: false })
    .order("created_at", { ascending: true }).limit(25);

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Top earners</h1>
      <p className="mt-1 text-ink/60">Ranked by VYR earned from completed missions.</p>
      <ol className="mt-4 divide-y divide-line">
        {(data ?? []).map((p, i) => (
          <li key={p.id} className={`flex items-center justify-between py-3.5 ${p.id === user?.id ? "font-semibold" : ""}`}>
            <span className="flex items-center gap-3">
              <span className="w-6 text-right font-display text-lg text-ink/40">{i + 1}</span>
              <span>@{p.username}{p.id === user?.id ? " (you)" : ""}</span>
            </span>
            <span className="text-right">
              <span className="font-display font-bold text-[#B7791A]">{fmt(Number(p.lifetime_earned))}</span>
              <span className="ml-2 text-xs text-ink/50">{p.missions_completed} done</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
