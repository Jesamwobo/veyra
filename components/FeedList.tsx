"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt, timeAgo } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

const EMOJIS = ["🔥", "👏", "💜"];

export default function FeedList({ initial, me }: { initial: FeedItem[]; me: string }) {
  const [items, setItems] = useState<FeedItem[]>(initial);

  const refresh = useCallback(async () => {
    const { data } = await createClient().rpc("get_feed", { p_limit: 50 });
    if (data) setItems(data as FeedItem[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_events" }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  async function react(id: string, emoji: string) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const has = it.mine.includes(emoji);
        return {
          ...it,
          reactions: { ...it.reactions, [emoji]: Math.max(0, (it.reactions[emoji] ?? 0) + (has ? -1 : 1)) },
          mine: has ? it.mine.filter((e) => e !== emoji) : [...it.mine, emoji],
        };
      })
    );
    const { error } = await createClient().rpc("toggle_reaction", { p_event: id, p_emoji: emoji });
    if (error) refresh();
  }

  if (items.length === 0) return <p className="mt-4 text-ink/60">No activity yet. Complete a mission to start the feed.</p>;

  return (
    <ul className="mt-4 divide-y divide-line">
      {items.map((e) => (
        <li key={e.id} className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm">{e.message}</p>
              <p className="text-xs text-ink/50">{timeAgo(e.created_at)}</p>
            </div>
            {e.amount ? <span className="shrink-0 font-display font-bold text-[#B7791A]">{fmt(Number(e.amount))} VYR</span> : null}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {EMOJIS.map((em) => {
              const on = e.mine.includes(em);
              const n = e.reactions[em] ?? 0;
              return (
                <button key={em} type="button" aria-pressed={on} onClick={() => react(e.id, em)}
                  className={`rounded-full border px-2.5 py-1 text-sm transition ${on ? "border-iris bg-iris/10" : "border-line bg-white hover:border-iris/50"}`}>
                  <span aria-hidden="true">{em}</span>{n > 0 && <span className="ml-1 text-xs font-semibold">{n}</span>}
                </button>
              );
            })}
            {e.actor_username && e.actor_username !== me && (
              <Link href={`/send?to=${e.actor_username}`} className="ml-auto text-sm font-semibold text-iris hover:underline">
                Send VYR to @{e.actor_username}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
