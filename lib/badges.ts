import type { Stats } from "./types";

export type Badge = { id: string; icon: string; name: string; hint: string; earned: (s: Stats) => boolean };

export const BADGES: Badge[] = [
  { id: "first", icon: "🌱", name: "First step", hint: "Complete a mission", earned: (s) => s.missions_completed >= 1 },
  { id: "roll", icon: "🔥", name: "On a roll", hint: "3-day streak", earned: (s) => s.best_streak >= 3 },
  { id: "week", icon: "🏆", name: "Week warrior", hint: "7-day streak", earned: (s) => s.best_streak >= 7 },
  { id: "give", icon: "💸", name: "Generous", hint: "Send VYR to a friend", earned: (s) => s.transfers_sent >= 1 },
  { id: "ten", icon: "✅", name: "Ten down", hint: "Complete 10 missions", earned: (s) => s.missions_completed >= 10 },
  { id: "earn", icon: "🪙", name: "Big earner", hint: "Earn 500 VYR", earned: (s) => s.lifetime_earned >= 500 },
];
