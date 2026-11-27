"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CatalogItem, Task } from "@/lib/types";
import { fmt } from "@/lib/format";
import Countdown from "@/components/Countdown";
import DeadlinePicker from "@/components/DeadlinePicker";
import MemberPicker from "@/components/MemberPicker";
import ProofForm from "@/components/ProofForm";

type Notice = { ok: boolean; text: string } | null;
type Result = { error: { message: string } | null };
type Run = (key: string, fn: () => PromiseLike<Result>, okText: string) => Promise<void>;

const STATUS_LABEL: Record<string, string> = {
  open: "Waiting for response", in_progress: "In progress", submitted: "Awaiting review",
  completed: "Completed", expired: "Expired", cancelled: "Cancelled", disputed: "In dispute",
};

function Reward({ n }: { n: number }) {
  return <span className="font-semibold text-[#B7791A]">{fmt(n)} VYR</span>;
}

function Evidence({ t }: { t: Task }) {
  return (
    <div className="mt-2 rounded-lg bg-paper p-3 text-sm">
      <p className="whitespace-pre-wrap">{t.submission_text}</p>
      {t.evidence_url && (
        <a href={t.evidence_url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all font-semibold text-iris hover:underline">
          {t.evidence_url}
        </a>
      )}
    </div>
  );
}

function ReviewCard({ t, busy, run }: { t: Task; busy: string | null; run: Run }) {
  const supabase = createClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const personal = t.mission_type === "personal";
  const who = personal ? t.creator_username : t.assignee_username;
  const mine = busy === t.id;

  return (
    <li className="py-4">
      <p className="text-sm text-ink/60">{personal ? "Verify a mission" : "Review submitted work"} from @{who}</p>
      <p className="font-medium">{t.title}</p>
      <p className="text-sm text-ink/55"><Reward n={t.reward_amount} /> · <Countdown deadline={t.deadline} /></p>
      <Evidence t={t} />
      {rejecting ? (
        <div className="mt-3 space-y-2">
          <label className="label" htmlFor={`rej-${t.id}`}>What needs to change?</label>
          <input id={`rej-${t.id}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <div className="flex gap-2">
            <button className="btn-primary" disabled={mine || note.trim().length < 3}
              onClick={() => run(t.id, () => supabase.rpc("review_mission", { p_mission_id: t.id, p_approve: false, p_note: note.trim() }), "Sent back with your note.")}>
              Send feedback
            </button>
            <button className="btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button className="btn-mint" disabled={mine}
            onClick={() => run(t.id, () => supabase.rpc("review_mission", { p_mission_id: t.id, p_approve: true, p_note: null }),
              personal ? `Verified. @${who} earned ${fmt(t.reward_amount)} VYR.` : `Approved. @${who} was paid ${fmt(t.reward_amount)} VYR.`)}>
            Approve
          </button>
          <button className="btn-ghost" disabled={mine} onClick={() => setRejecting(true)}>Reject</button>
        </div>
      )}
    </li>
  );
}

function InviteCard({ t, busy, run }: { t: Task; busy: string | null; run: Run }) {
  const supabase = createClient();
  const mine = busy === t.id;
  return (
    <li className="py-4">
      <p className="text-sm text-ink/60">@{t.creator_username} wants you to do this</p>
      <p className="font-medium">{t.title}</p>
      {t.description && <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{t.description}</p>}
      <p className="mt-1 text-sm text-ink/55">Pays <Reward n={t.reward_amount} /> · <Countdown deadline={t.deadline} /></p>
      <div className="mt-3 flex gap-2">
        <button className="btn-mint" disabled={mine}
          onClick={() => run(t.id, () => supabase.rpc("respond_task", { p_mission_id: t.id, p_accept: true }), "Accepted. Submit your work before the deadline.")}>
          Accept
        </button>
        <button className="btn-ghost" disabled={mine}
          onClick={() => run(t.id, () => supabase.rpc("respond_task", { p_mission_id: t.id, p_accept: false }), "Declined.")}>
          Decline
        </button>
      </div>
    </li>
  );
}

function WorkCard({ t, busy, run }: { t: Task; busy: string | null; run: Run }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  return (
    <li className="py-4">
      <p className="text-sm text-ink/60">Your task from @{t.creator_username}</p>
      <p className="font-medium">{t.title}</p>
      {t.description && <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{t.description}</p>}
      <p className="mt-1 text-sm text-ink/55">Pays <Reward n={t.reward_amount} /> · <Countdown deadline={t.deadline} /></p>
      {t.rejection_count > 0 && t.review_note && (
        <p className="mt-2 rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose">@{t.creator_username} asked for changes: {t.review_note}</p>
      )}
      {open ? (
        <ProofForm busy={busy === t.id} cta="Submit work"
          onSubmit={(text, link) => run(t.id, () => supabase.rpc("submit_mission", { p_mission_id: t.id, p_text: text, p_url: link.trim() || null }), "Work submitted. You are paid when it is approved.")} />
      ) : (
        <button className="btn-primary mt-3" onClick={() => setOpen(true)}>Submit work</button>
      )}
    </li>
  );
}

export default function TaskBoard({
  tasks, catalog, balance,
}: { tasks: Task[]; catalog: CatalogItem[]; balance: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tier, setTier] = useState(catalog[0]?.id ?? "");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");

  const run: Run = async (key, fn, okText) => {
    setBusy(key); setNotice(null);
    const { error } = await fn();
    if (error) setNotice({ ok: false, text: error.message });
    else { setNotice({ ok: true, text: okText }); router.refresh(); }
    setBusy(null);
  };

  const jobs = tasks.filter((t) => t.mission_type === "community_job");
  const reviewQueue = tasks.filter((t) => t.status === "submitted" &&
    ((t.mission_type === "personal" && t.is_verifier) || (t.mission_type === "community_job" && t.is_creator)));
  const invites = jobs.filter((t) => t.is_assignee && t.status === "open");
  const myWork = jobs.filter((t) => t.is_assignee && t.status === "in_progress");
  const assignedByMe = jobs.filter((t) => t.is_creator && ["open", "in_progress", "disputed"].includes(t.status));
  const waitingOnReview = jobs.filter((t) => t.is_assignee && t.status === "submitted");
  const history = tasks.filter((t) => ["completed", "expired", "cancelled"].includes(t.status) &&
    (t.mission_type === "community_job" || t.is_verifier)).slice(0, 12);
  const attention = reviewQueue.length + invites.length + myWork.length;

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignee) { setNotice({ ok: false, text: "Choose who to assign the task to." }); return; }
    if (!deadline) { setNotice({ ok: false, text: "Set a deadline." }); return; }
    await run("assign", () => supabase.rpc("assign_task", {
      p_title: title.trim(), p_description: desc.trim(), p_catalog_id: tier,
      p_assignee_username: assignee, p_deadline: new Date(deadline).toISOString(),
    }), "Task sent. The reward is now held in escrow until you approve the work.");
    setTitle(""); setDesc(""); setDeadline("");
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Tasks</h1>
      <p className="mt-1 text-ink/60">Verify friends’ missions, do tasks for others, or assign your own.</p>

      {notice && <p role="status" className={`mt-3 text-sm font-medium ${notice.ok ? "text-mint" : "text-rose"}`}>{notice.text}</p>}

      <section className="mt-6" aria-labelledby="att-h">
        <h2 id="att-h" className="font-display text-xl font-bold">Needs your attention {attention > 0 && <span className="ml-1 rounded-full bg-rose px-2 py-0.5 text-sm text-white">{attention}</span>}</h2>
        {attention === 0 ? (
          <p className="mt-2 text-ink/60">You’re all caught up.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {reviewQueue.map((t) => <ReviewCard key={t.id} t={t} busy={busy} run={run} />)}
            {invites.map((t) => <InviteCard key={t.id} t={t} busy={busy} run={run} />)}
            {myWork.map((t) => <WorkCard key={t.id} t={t} busy={busy} run={run} />)}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="assign-h">
        <h2 id="assign-h" className="font-display text-xl font-bold">Assign a task</h2>
        <p className="mt-1 text-sm text-ink/60">
          You have {fmt(balance)} VYR. The reward leaves your wallet now and is held in escrow. It is paid when you approve the work and refunded if the task is declined, cancelled before acceptance, or missed.
        </p>
        <form onSubmit={assign} className="mt-3 space-y-4 rounded-xl border border-line bg-white p-4">
          <div>
            <label className="label" htmlFor="t-title">Task</label>
            <input id="t-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Review my business website" required />
          </div>
          <div>
            <label className="label" htmlFor="t-desc">What does done look like?</label>
            <textarea id="t-desc" className="input min-h-[84px]" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000}
              placeholder="Check navigation, mobile layout and how clear the text is. Send me a short list of fixes." required />
          </div>
          <div>
            <label className="label" htmlFor="t-tier">Reward</label>
            <select id="t-tier" className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
              {catalog.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.reward_amount} VYR)</option>)}
            </select>
          </div>
          <MemberPicker id="t-assignee" label="Assign to" value={assignee} onChange={setAssignee} />
          <DeadlinePicker id="t-deadline" value={deadline} onChange={setDeadline} />
          <button className="btn-primary" disabled={busy === "assign" || !title.trim() || desc.trim().length < 10}>Send task</button>
        </form>
      </section>

      {(assignedByMe.length > 0 || waitingOnReview.length > 0) && (
        <section className="mt-10" aria-labelledby="mine-h">
          <h2 id="mine-h" className="font-display text-xl font-bold">In progress</h2>
          <ul className="mt-1 divide-y divide-line">
            {assignedByMe.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-sm text-ink/55">To @{t.assignee_username} · <Reward n={t.reward_amount} /> · {STATUS_LABEL[t.status]}</p>
                  {t.status !== "disputed" && <p className="text-sm text-ink/55"><Countdown deadline={t.deadline} /></p>}
                  {t.status === "disputed" && <p className="text-sm text-rose">Reward stays in escrow until the dispute is resolved.</p>}
                </div>
                {t.status === "open" && (
                  <button className="btn-ghost shrink-0" disabled={busy === t.id}
                    onClick={() => run(t.id, () => supabase.rpc("cancel_mission", { p_mission_id: t.id }), "Cancelled. Your VYR was refunded.")}>
                    Cancel
                  </button>
                )}
              </li>
            ))}
            {waitingOnReview.map((t) => (
              <li key={t.id} className="py-3.5">
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-ink/55">Submitted to @{t.creator_username} · <Reward n={t.reward_amount} /> · they have 48 hours to respond</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-10" aria-labelledby="hist-h">
          <h2 id="hist-h" className="font-display text-xl font-bold">History</h2>
          <ul className="mt-1 divide-y divide-line text-sm">
            {history.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.title}</span>
                  <span className="block text-ink/55">
                    {t.mission_type === "personal" ? `Verified for @${t.creator_username}` : t.is_creator ? `To @${t.assignee_username}` : `From @${t.creator_username}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block"><Reward n={t.reward_amount} /></span>
                  <span className={`block ${t.status === "completed" ? "text-mint" : "text-ink/50"}`}>{STATUS_LABEL[t.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
