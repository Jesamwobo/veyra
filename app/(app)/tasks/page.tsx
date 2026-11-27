import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskBoard from "@/components/TaskBoard";
import type { CatalogItem, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("process_due");

  const [tasks, catalog, wallet] = await Promise.all([
    supabase.rpc("my_tasks"),
    supabase.from("reward_catalog").select("id,title,reward_amount").eq("category", "community_job").eq("active", true).order("reward_amount"),
    supabase.from("wallets").select("available_balance").eq("owner_type", "user").eq("owner_id", user.id).single(),
  ]);

  return (
    <TaskBoard
      tasks={(tasks.data ?? []) as Task[]}
      catalog={(catalog.data ?? []) as CatalogItem[]}
      balance={Number(wallet.data?.available_balance ?? 0)}
    />
  );
}
