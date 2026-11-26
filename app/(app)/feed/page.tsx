import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedList from "@/components/FeedList";
import type { FeedItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [feed, me] = await Promise.all([
    supabase.rpc("get_feed", { p_limit: 50 }),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
  ]);
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Activity</h1>
      <p className="mt-1 text-ink/60">Cheer people on, or send them some VYR.</p>
      <FeedList initial={(feed.data ?? []) as FeedItem[]} me={me.data?.username ?? ""} />
    </>
  );
}
