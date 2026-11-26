import { createClient } from "@/lib/supabase/server";
import FeedList from "@/components/FeedList";
import type { FeedEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = createClient();
  const { data } = await supabase.from("feed_events").select("id,kind,message,amount,created_at")
    .order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Activity</h1>
      <FeedList initial={(data ?? []) as FeedEvent[]} />
    </>
  );
}
