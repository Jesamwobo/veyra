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
export type FeedEvent = {
  id: string; kind: string; message: string; amount: number | null; created_at: string;
};
