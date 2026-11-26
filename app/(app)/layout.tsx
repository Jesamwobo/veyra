import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

  return (
    <>
      <Nav username={profile?.username ?? "me"} />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </>
  );
}
