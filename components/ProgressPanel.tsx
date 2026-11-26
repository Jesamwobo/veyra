import { BADGES } from "@/lib/badges";
import { getLevel } from "@/lib/levels";
import { fmt } from "@/lib/format";
import type { Stats } from "@/lib/types";

export default function ProgressPanel({ stats }: { stats: Stats }) {
  const level = getLevel(stats.xp);
  const R = 28;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, stats.daily_cap > 0 ? stats.used_today / stats.daily_cap : 0);

  const streakNote = stats.done_today
    ? "Locked in for today"
    : stats.streak > 0
    ? "Complete a mission today to keep it alive"
    : "Complete a mission to start a streak";

  return (
    <section aria-label="Your progress" className="mt-4 rounded-2xl border border-line bg-white">
      <div className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xl font-bold">{level.name}</p>
          <p className="text-sm text-ink/60">{fmt(stats.xp)} XP</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={Math.round(level.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
          <div className="h-full rounded-full bg-iris transition-all duration-700" style={{ width: `${Math.max(3, level.progress * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-ink/55">
          {level.next ? `${fmt(level.toNext)} XP to ${level.next}` : "Top level reached"}
        </p>
      </div>

      <div className="grid grid-cols-2 border-t border-line">
        <div className="p-5">
          <p className="font-display text-3xl font-bold">
            <span aria-hidden="true">🔥</span> {stats.streak}
            <span className="ml-1 text-base font-semibold text-ink/60">{stats.streak === 1 ? "day" : "days"}</span>
          </p>
          <p className="mt-1 text-xs text-ink/55">{streakNote}</p>
        </div>
        <div className="flex items-center gap-3 border-l border-line p-5">
          <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${stats.used_today} of ${stats.daily_cap} VYR earned today`}>
            <circle cx="32" cy="32" r={R} fill="none" stroke="#ECEFF5" strokeWidth="7" />
            <circle cx="32" cy="32" r={R} fill="none" stroke="#F4B63C" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 32 32)"
              style={{ transition: "stroke-dashoffset .7s ease" }} />
          </svg>
          <div>
            <p className="font-display text-xl font-bold leading-tight">{fmt(stats.used_today)}<span className="text-sm font-semibold text-ink/55"> / {fmt(stats.daily_cap)}</span></p>
            <p className="text-xs text-ink/55">Earned today</p>
          </div>
        </div>
      </div>

      <div className="border-t border-line p-5">
        <p className="text-sm font-semibold">Badges</p>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {BADGES.map((b) => {
            const on = b.earned(stats);
            return (
              <li key={b.id} className={`rounded-xl px-2 py-3 text-center ${on ? "bg-coin/20" : "bg-paper"}`}>
                <p className={`text-2xl ${on ? "" : "opacity-30 grayscale"}`} aria-hidden="true">{b.icon}</p>
                <p className={`mt-1 text-xs font-semibold ${on ? "text-ink" : "text-ink/45"}`}>{b.name}</p>
                <p className="text-[11px] leading-tight text-ink/50">{on ? "Earned" : b.hint}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
