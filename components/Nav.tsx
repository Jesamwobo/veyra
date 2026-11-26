"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/send", label: "Send" },
  { href: "/feed", label: "Feed" },
  { href: "/leaderboard", label: "Leaders" },
];

export default function Nav({ username }: { username: string }) {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <span className="font-display text-xl font-bold tracking-tight">Veyra</span>
        <nav className="flex gap-1" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              aria-current={path === l.href ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${path === l.href ? "bg-ink text-white" : "text-ink/70 hover:bg-line/60"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="text-xs text-ink/50 hover:text-ink" title="Sign out">@{username}</button>
      </div>
    </header>
  );
}
