const pad = (n: number) => String(n).padStart(2, "0");

/** Format a Date for <input type="datetime-local"> (local time). */
export function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function quickDeadlines(now = new Date()): { label: string; date: Date }[] {
  const H = 3600000;
  const add = (ms: number) => new Date(now.getTime() + ms);
  const list = [
    { label: "In 1 hour", date: add(H) },
    { label: "In 3 hours", date: add(3 * H) },
  ];
  const tonight = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  if (tonight.getTime() - now.getTime() >= H) list.push({ label: "Tonight 9 pm", date: tonight });
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  list.push({ label: "Tomorrow 6 pm", date: tomorrow });
  list.push({ label: "In 3 days", date: add(72 * H) });
  list.push({ label: "In 1 week", date: add(168 * H) });
  return list;
}

export function timeLeft(deadline: string, now: number) {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return { text: "Overdue", urgent: true, overdue: true };
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  const text = d >= 1 ? `${d}d ${h}h` : h >= 1 ? `${h}h ${mm}m` : `${Math.max(1, mm)}m`;
  return { text: `Due in ${text}`, urgent: ms < 3600000, overdue: false };
}

export function fmtDeadline(deadline: string) {
  return new Date(deadline).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
