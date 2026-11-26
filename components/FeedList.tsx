"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmt, timeAgo } from "@/lib/format";
import type { FeedEvent } from "@/lib/types";

export default function FeedList({ initial }: { initial: FeedEvent[] }) {
  const [events, setEvents] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_events" },
        (p) => setEvents((prev) => [p.new as FeedEvent, ...prev].slice(0, 60)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (events.length === 0) return <p className="mt-4 text-ink/60">No activity yet. Complete a mission to start the feed.</p>;

  return (
    <ul className="mt-4 divide-y divide-line">
      {events.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3 py-3.5">
          <div>
            <p className="text-sm">{e.message}</p>
            <p className="text-xs text-ink/50">{timeAgo(e.created_at)}</p>
          </div>
          {e.amount ? <span className="shrink-0 font-display font-bold text-[#B7791A]">{fmt(Number(e.amount))} VYR</span> : null}
        </li>
      ))}
    </ul>
  );
}
