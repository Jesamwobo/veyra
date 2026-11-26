import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veyra: make progress, earn value, help others",
  description:
    "Veyra is a social productivity app with its own virtual currency. Finish missions, earn VYR and share it with friends.",
};

const steps = [
  { title: "Set a mission", text: "Pick something you want to get done, like reading 20 pages or finishing a lesson, and choose how hard it is." },
  { title: "Finish it", text: "Tap Done when it’s done. Your streak grows and your level bar moves." },
  { title: "Earn VYR", text: "Each difficulty pays a fixed amount, so you always know what a mission is worth before you start." },
  { title: "Share the value", text: "Send VYR to a friend who helped you, cheer on their wins in the feed, and see who’s leading." },
];

const rules = [
  { term: "VYR has no cash value", text: "It’s a virtual reward unit. It can’t be bought, sold or withdrawn." },
  { term: "Rewards are fixed", text: "Missions pay from a set catalogue, from 10 to 200 VYR. Nobody can pick their own price." },
  { term: "Earning is capped each day", text: "A daily limit stops one person from flooding the economy." },
  { term: "Every movement is recorded", text: "Each transfer is written to a permanent ledger that can’t be edited or deleted." },
];

const goals = [
  { title: "Make effort feel rewarded", text: "Most to-do apps track what you did. We want to find out whether a visible reward helps people finish more of what they start." },
  { title: "Make helping each other normal", text: "VYR is a way to say thank you. We want to see whether people willingly send it to friends who help them." },
  { title: "Keep the economy fair", text: "Fixed rewards, daily limits and an open ledger, so VYR keeps meaning something as more people join." },
];

const ledger = [
  { label: "Welcome grant", amount: 100 },
  { label: "Read 20 pages", amount: 25 },
  { label: "Finish one lesson", amount: 50 },
  { label: "Sent to @amanda", amount: -20 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-coin font-display text-lg font-bold text-ink">V</span>
          <span className="font-display text-2xl font-bold tracking-tight">Veyra</span>
        </span>
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/login" className="btn-primary">Join the beta</Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.15fr_1fr] md:pt-14">
          <div>
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Make progress.<br />Earn value.<br />Help others.<br />Build together.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
              Veyra is a social productivity app with its own virtual currency, VYR. Finish missions to earn it, send it to friends who help you, and grow your level and streak along the way.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary !px-6 !py-3 text-base">Join the beta</Link>
              <a href="#how" className="btn-ghost !px-4 !py-3 text-base">See how it works</a>
            </div>
            <p className="mt-4 text-sm text-ink/55">Free to join. Works in your phone’s browser.</p>
          </div>

          <div className="rounded-2xl bg-ink p-6 text-white" role="img" aria-label="Example wallet showing 155 VYR with recent activity">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-coin font-display text-2xl font-bold text-ink shadow-[inset_0_-4px_0_rgba(0,0,0,.15)]">V</span>
              <div>
                <p className="text-sm text-white/60">Example wallet</p>
                <p className="font-display text-4xl font-bold leading-none">155 <span className="text-xl font-semibold text-coin">VYR</span></p>
              </div>
            </div>
            <ul className="mt-6 divide-y divide-white/10 border-t border-white/10">
              {ledger.map((r) => (
                <li key={r.label} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-white/80">{r.label}</span>
                  <span className={`font-display text-lg font-bold ${r.amount > 0 ? "text-coin" : "text-white/60"}`}>
                    {r.amount > 0 ? "+" : "−"}{Math.abs(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-line bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <ol className="mt-8 divide-y divide-line">
              {steps.map((s, i) => (
                <li key={s.title} className="grid gap-3 py-6 sm:grid-cols-[3rem_14rem_1fr] sm:items-baseline">
                  <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-coin font-display font-bold text-ink">{i + 1}</span>
                  <h3 className="font-display text-xl font-bold">{s.title}</h3>
                  <p className="max-w-lg text-ink/70">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Economy */}
        <section className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">A fair, closed economy</h2>
          <p className="mt-3 max-w-xl text-lg text-ink/70">VYR only works if people can trust it. These rules are built into the database, not just promised.</p>
          <dl className="mt-8 grid gap-x-12 gap-y-7 sm:grid-cols-2">
            {rules.map((r) => (
              <div key={r.term} className="border-l-4 border-coin pl-4">
                <dt className="font-display text-lg font-bold">{r.term}</dt>
                <dd className="mt-1 text-ink/70">{r.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Goals */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">What we hope to achieve</h2>
            <div className="mt-8 grid gap-10 md:grid-cols-3">
              {goals.map((g) => (
                <div key={g.title}>
                  <h3 className="font-display text-xl font-bold">{g.title}</h3>
                  <p className="mt-2 text-ink/70">{g.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Beta + roadmap */}
        <section className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Where we are now</h2>
            <p className="mt-3 text-ink/70">
              Veyra is an early beta with a small group of friends. We’re watching one thing closely: do people come back the next day, and do they send VYR to each other without being asked? Your feedback decides what gets built next.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Coming next</h2>
            <ul className="mt-3 space-y-2 text-ink/70">
              <li><span className="font-semibold text-ink">Job board:</span> ask a friend for help and pay them in VYR, held safely in escrow until the work is approved.</li>
              <li><span className="font-semibold text-ink">Communities:</span> private groups with their own leaderboards.</li>
              <li><span className="font-semibold text-ink">Group challenges:</span> 30 days of reading, together.</li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-ink">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Ready to earn your first VYR?</h2>
            <Link href="/login" className="btn-primary !bg-coin !px-6 !py-3 text-base !text-ink hover:!bg-[#e5a82c]">Join the beta</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-5 py-8 text-xs text-ink/55">
        VYR is a virtual reward unit with no monetary value. It cannot be exchanged for cash or cryptocurrency, and Veyra is not a payment service.
      </footer>
    </div>
  );
}
