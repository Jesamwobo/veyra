"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "/send", label: "Send" },
  { href: "/feed", label: "Feed" },
  { href: "/leaderboard", label: "Top" },
];

export default function Nav({ username }: { username: string }) {
  const path = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await createClient().rpc("my_action_count");
      if (alive && typeof data === "number") setCount(data);
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [path]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-xl font-bold tracking-tight">Veyra</span>
          <span className="flex min-w-0 items-center gap-3 text-xs text-ink/60">
            <span className="truncate">@{username}</span>
            <button onClick={signOut} className="shrink-0 font-semibold text-ink/70 underline-offset-2 hover:underline">Sign out</button>
          </span>
        </div>
        <nav className="mt-2 grid grid-cols-5 gap-1 pb-2" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
              className={`rounded-lg py-2.5 text-center text-[13px] font-medium transition sm:text-sm ${path === l.href ? "bg-ink text-white" : "text-ink/70 hover:bg-line/60"}`}
            >
              {l.label}
              {l.href === "/tasks" && count > 0 && (
                <span className="ml-1 rounded-full bg-rose px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{count}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
