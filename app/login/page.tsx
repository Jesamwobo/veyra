"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);

    if (mode === "signup") {
      const clean = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
        setError("Username must be 3–20 characters: letters, numbers or underscores.");
        setBusy(false); return;
      }
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { username: clean } },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo("Check your email to confirm your account, then sign in.");
      else { router.push("/dashboard"); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else { router.push("/dashboard"); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-coin font-display text-xl font-bold text-ink">V</span>
        <h1 className="font-display text-4xl font-bold tracking-tight">Veyra</h1>
      </div>
      <p className="mb-8 text-lg leading-snug text-ink/70">
        Make progress. Earn value. Help others. Build together.
      </p>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="daniel" autoComplete="username" required />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
        </div>

        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        {info && <p className="text-sm text-mint">{info}</p>}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Please wait" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button className="btn-ghost mt-4 self-start" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); setInfo(null); }}>
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
      <p className="mt-10 text-xs text-ink/50">VYR is a virtual reward unit. It has no cash value and can’t be withdrawn.</p>
    </main>
  );
}
