export type Profile = {
  id: string; username: string; display_name: string;
  lifetime_earned: number; missions_completed: number;
};
export type CatalogItem = { id: string; title: string; reward_amount: number };
export type Mission = {
  id: string; title: string; reward_amount: number;
  status: string; deadline: string | null; completed_at: string | null;
};
export type HistoryRow = {
  id: string; created_at: string; transaction_type: string;
  amount: number; description: string | null; counterparty: string | null;
};
export type FeedItem = {
  id: string; kind: string; message: string; amount: number | null; created_at: string;
  actor_username: string | null; reactions: Record<string, number>; mine: string[];
};
export type Stats = {
  used_today: number; daily_cap: number; streak: number; best_streak: number;
  done_today: boolean; xp: number; missions_completed: number;
  transfers_sent: number; lifetime_earned: number;
};

export type Task = {
  id: string;
  mission_type: "personal" | "community_job";
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  deadline: string;
  created_at: string;
  completed_at: string | null;
  submitted_at: string | null;
  submission_text: string | null;
  evidence_url: string | null;
  review_note: string | null;
  rejection_count: number;
  creator_username: string;
  assignee_username: string | null;
  verifier_username: string | null;
  is_creator: boolean;
  is_assignee: boolean;
  is_verifier: boolean;
};
