-- =====================================================================
-- VEYRA MVP MIGRATION  (run once in Supabase > SQL Editor, dev project first)
-- Covers: profiles, wallets, double-entry ledger, reward catalogue,
-- personal missions, transfers, activity feed, RLS, triggers, RPCs.
-- Deferred (per PRD): escrow/job board, communities, challenges, admin.
-- =====================================================================

create extension if not exists pgcrypto;

-- ENUMS (full PRD set so later modules need no enum migration) ----------
create type public.wallet_owner_type as enum ('user','community','mission_escrow','platform');
create type public.mission_type as enum ('personal','community_job','collective');
create type public.mission_status as enum ('draft','open','accepted','in_progress','submitted','completed','rejected','cancelled','expired','disputed');
create type public.transaction_type as enum ('platform_issuance','member_transfer','job_escrow_funding','job_reward_release','job_refund','treasury_contribution','treasury_distribution','admin_adjustment');

-- SETTINGS (admin-tunable, single row) ----------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  daily_issuance_cap bigint not null default 500,
  welcome_grant bigint not null default 100,
  max_open_missions int not null default 10,
  max_transfer bigint not null default 10000
);
insert into public.app_settings default values;

-- PROFILES --------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text,
  bio text,
  reputation_xp integer not null default 0 check (reputation_xp >= 0),
  lifetime_earned bigint not null default 0,
  missions_completed integer not null default 0,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

-- WALLETS (platform wallet may go negative = total VYR ever issued) -------
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  owner_type public.wallet_owner_type not null,
  owner_id uuid,
  available_balance bigint not null default 0,
  reserved_balance bigint not null default 0 check (reserved_balance >= 0),
  created_at timestamptz not null default now(),
  unique (owner_type, owner_id),
  check (owner_type = 'platform' or available_balance >= 0)
);
insert into public.wallets (id, owner_type, owner_id)
values ('00000000-0000-0000-0000-000000000001', 'platform', null);

-- LEDGER ----------------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type public.transaction_type not null,
  reference_type text,
  reference_id uuid,
  idempotency_key text unique,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.wallet_transactions(id),
  wallet_id uuid not null references public.wallets(id),
  amount bigint not null check (amount <> 0),
  created_at timestamptz not null default now()
);
create index wallet_entries_wallet_idx on public.wallet_entries(wallet_id, created_at desc);
create index wallet_entries_tx_idx on public.wallet_entries(transaction_id);
create index wallet_transactions_ref_idx on public.wallet_transactions(reference_type, reference_id);

-- Ledger rows can never be changed or removed
create function public.block_mutation() returns trigger language plpgsql as $$
begin raise exception 'Ledger records are immutable'; end $$;
create trigger wallet_entries_immutable before update or delete on public.wallet_entries
  for each row execute function public.block_mutation();
create trigger wallet_transactions_immutable before update or delete on public.wallet_transactions
  for each row execute function public.block_mutation();

-- Every transaction's entries must sum to zero (checked at commit)
create function public.check_tx_balanced() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select coalesce(sum(amount),0) from public.wallet_entries where transaction_id = new.transaction_id) <> 0 then
    raise exception 'Unbalanced transaction';
  end if;
  return null;
end $$;
create constraint trigger wallet_entries_balanced after insert on public.wallet_entries
  deferrable initially deferred for each row execute function public.check_tx_balanced();

-- REWARD CATALOGUE ------------------------------------------------------
create table public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  difficulty text not null,
  title text not null,
  reward_amount bigint not null check (reward_amount > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category, difficulty)
);
insert into public.reward_catalog (category, difficulty, title, reward_amount) values
 ('personal','very_easy','Very easy: read 5 pages',10),
 ('personal','easy','Easy: read 20 pages',25),
 ('personal','moderate','Moderate: complete a lesson',50),
 ('personal','difficult','Difficult: finish a practical exercise',100),
 ('personal','advanced','Advanced: reach a project milestone',200),
 ('community_job','basic','Basic: quick feedback',50),
 ('community_job','standard','Standard: review a CV or document',100),
 ('community_job','intermediate','Intermediate: review a website',200),
 ('community_job','advanced','Advanced: design or technical task',350),
 ('community_job','expert','Expert: specialist task',500);

-- MISSIONS --------------------------------------------------------------
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  mission_type public.mission_type not null default 'personal',
  title text not null check (char_length(title) between 1 and 120),
  category text,
  difficulty text,
  reward_catalog_id uuid references public.reward_catalog(id),
  reward_amount bigint not null check (reward_amount > 0),
  status public.mission_status not null default 'open',
  deadline timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index missions_creator_idx on public.missions(creator_id, created_at desc);

-- ACTIVITY FEED ---------------------------------------------------------
create table public.feed_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  kind text not null,
  message text not null,
  amount bigint,
  created_at timestamptz not null default now()
);
create index feed_events_created_idx on public.feed_events(created_at desc);

-- INTERNAL: the only code path that moves VYR ------------------------------
create function public._post_transfer(
  p_from uuid, p_to uuid, p_amount bigint, p_type public.transaction_type,
  p_desc text, p_by uuid, p_idem text, p_ref_type text, p_ref_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tx uuid;
  v_from_type public.wallet_owner_type;
  v_from_bal bigint;
begin
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  -- lock both wallets in a deterministic order (prevents deadlocks)
  perform 1 from public.wallets where id in (p_from, p_to) order by id for update;

  select owner_type, available_balance into v_from_type, v_from_bal
  from public.wallets where id = p_from;

  if v_from_type <> 'platform' and v_from_bal < p_amount then
    raise exception 'Insufficient funds';
  end if;

  update public.wallets set available_balance = available_balance - p_amount where id = p_from;
  update public.wallets set available_balance = available_balance + p_amount where id = p_to;

  insert into public.wallet_transactions
    (transaction_type, reference_type, reference_id, idempotency_key, description, created_by)
  values (p_type, p_ref_type, p_ref_id, p_idem, p_desc, p_by)
  returning id into v_tx;

  insert into public.wallet_entries (transaction_id, wallet_id, amount)
  values (v_tx, p_from, -p_amount), (v_tx, p_to, p_amount);

  return v_tx;
end $$;

-- NEW USER: profile + wallet + welcome grant -----------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
  v_wallet uuid;
  v_grant bigint;
begin
  v_username := left(lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1)),
    '[^a-zA-Z0-9_]', '', 'g')), 20);
  if char_length(v_username) < 3 then
    v_username := 'user' || substr(md5(random()::text), 1, 6);
  end if;
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := left(v_username, 16) || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_username);

  insert into public.wallets (owner_type, owner_id) values ('user', new.id)
  returning id into v_wallet;

  select welcome_grant into v_grant from public.app_settings where id;
  if v_grant > 0 then
    perform public._post_transfer(
      '00000000-0000-0000-0000-000000000001', v_wallet, v_grant,
      'platform_issuance', 'Welcome grant', new.id,
      'welcome:' || new.id, 'welcome', new.id);
  end if;

  insert into public.feed_events (actor_id, kind, message)
  values (new.id, 'joined', '@' || v_username || ' joined Veyra');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: create a personal mission (reward comes from the catalogue only) -----
create function public.create_mission(p_title text, p_catalog_id uuid, p_deadline timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cat public.reward_catalog%rowtype;
  v_open int;
  v_max int;
  v_id uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if exists (select 1 from public.profiles where id = v_user and is_suspended) then
    raise exception 'Account suspended';
  end if;
  if p_title is null or char_length(btrim(p_title)) = 0 then raise exception 'Title required'; end if;
  if char_length(p_title) > 120 then raise exception 'Title too long'; end if;

  select * into v_cat from public.reward_catalog
  where id = p_catalog_id and active and category = 'personal';
  if not found then raise exception 'Invalid difficulty'; end if;

  select max_open_missions into v_max from public.app_settings where id;
  select count(*) into v_open from public.missions where creator_id = v_user and status = 'open';
  if v_open >= v_max then
    raise exception 'You can have at most % open missions', v_max;
  end if;

  insert into public.missions
    (creator_id, mission_type, title, category, difficulty, reward_catalog_id, reward_amount, deadline)
  values
    (v_user, 'personal', btrim(p_title), v_cat.category, v_cat.difficulty, v_cat.id, v_cat.reward_amount, p_deadline)
  returning id into v_id;
  return v_id;
end $$;

-- RPC: complete a personal mission and issue the reward --------------------
create function public.complete_mission(p_mission_id uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_m public.missions%rowtype;
  v_wallet uuid;
  v_used bigint;
  v_cap bigint;
  v_name text;
begin
  if v_user is null then raise exception 'Sign in required'; end if;

  select * into v_m from public.missions
  where id = p_mission_id and creator_id = v_user for update;
  if not found then raise exception 'Mission not found'; end if;
  if v_m.status <> 'open' then raise exception 'Mission is not open'; end if;
  if v_m.deadline is not null and v_m.deadline < now() then raise exception 'Mission deadline has passed'; end if;
  if exists (select 1 from public.profiles where id = v_user and is_suspended) then
    raise exception 'Account suspended';
  end if;

  select id into v_wallet from public.wallets where owner_type = 'user' and owner_id = v_user;
  select daily_issuance_cap into v_cap from public.app_settings where id;

  select coalesce(sum(e.amount), 0) into v_used
  from public.wallet_entries e
  join public.wallet_transactions t on t.id = e.transaction_id
  where e.wallet_id = v_wallet and e.amount > 0 and t.reference_type = 'mission'
    and t.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc');

  if v_used + v_m.reward_amount > v_cap then
    raise exception 'Daily reward limit reached (% VYR per day). Try again tomorrow.', v_cap;
  end if;

  perform public._post_transfer(
    '00000000-0000-0000-0000-000000000001', v_wallet, v_m.reward_amount,
    'platform_issuance', 'Mission: ' || v_m.title, v_user,
    'mission:' || v_m.id, 'mission', v_m.id);

  update public.missions set status = 'completed', completed_at = now() where id = v_m.id;
  update public.profiles
    set lifetime_earned = lifetime_earned + v_m.reward_amount,
        missions_completed = missions_completed + 1
  where id = v_user returning username into v_name;

  insert into public.feed_events (actor_id, kind, message, amount)
  values (v_user, 'mission', '@' || v_name || ' completed "' || v_m.title || '"', v_m.reward_amount);

  return v_m.reward_amount;
end $$;

-- RPC: cancel an open mission ---------------------------------------------
create function public.cancel_mission(p_mission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.missions set status = 'cancelled'
  where id = p_mission_id and creator_id = auth.uid() and status = 'open';
  if not found then raise exception 'Mission not found or not open'; end if;
end $$;

-- RPC: member-to-member transfer ------------------------------------------
create function public.transfer_vyr(
  p_recipient_username text, p_amount bigint, p_idem text, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_recipient_name text;
  v_sender_name text;
  v_sw uuid;
  v_rw uuid;
  v_max bigint;
  v_tx uuid;
begin
  if v_sender is null then raise exception 'Sign in required'; end if;
  if p_idem is null or char_length(p_idem) < 8 then raise exception 'Idempotency key required'; end if;

  -- a retried request returns the original transaction instead of paying twice
  select id into v_tx from public.wallet_transactions
  where idempotency_key = 'transfer:' || v_sender || ':' || p_idem;
  if found then return v_tx; end if;

  select max_transfer into v_max from public.app_settings where id;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount above 0'; end if;
  if p_amount > v_max then raise exception 'Maximum transfer is % VYR', v_max; end if;

  select username into v_sender_name from public.profiles where id = v_sender and not is_suspended;
  if v_sender_name is null then raise exception 'Account unavailable'; end if;

  select id, username into v_recipient, v_recipient_name from public.profiles
  where username = lower(btrim(p_recipient_username)) and not is_suspended;
  if v_recipient is null then raise exception 'Member not found'; end if;
  if v_recipient = v_sender then raise exception 'You cannot send VYR to yourself'; end if;

  select id into v_sw from public.wallets where owner_type = 'user' and owner_id = v_sender;
  select id into v_rw from public.wallets where owner_type = 'user' and owner_id = v_recipient;

  v_tx := public._post_transfer(
    v_sw, v_rw, p_amount, 'member_transfer',
    coalesce(nullif(left(btrim(p_note), 140), ''), 'Transfer'), v_sender,
    'transfer:' || v_sender || ':' || p_idem, 'transfer', null);

  insert into public.feed_events (actor_id, kind, message, amount)
  values (v_sender, 'transfer', '@' || v_sender_name || ' sent @' || v_recipient_name || ' VYR', p_amount);

  return v_tx;
end $$;

-- RPC: my transaction history (with counterparty) -------------------------
create function public.my_history(p_limit int default 20)
returns table (id uuid, created_at timestamptz, transaction_type text, amount bigint, description text, counterparty text)
language sql security definer set search_path = '' stable as $$
  select t.id, e.created_at, t.transaction_type::text, e.amount, t.description,
    (select p.username
       from public.wallet_entries e2
       join public.wallets w2 on w2.id = e2.wallet_id and w2.owner_type = 'user'
       join public.profiles p on p.id = w2.owner_id
      where e2.transaction_id = t.id and e2.wallet_id <> e.wallet_id
      limit 1)
  from public.wallet_entries e
  join public.wallet_transactions t on t.id = e.transaction_id
  where e.wallet_id = (select w.id from public.wallets w where w.owner_type = 'user' and w.owner_id = auth.uid())
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ROW LEVEL SECURITY -------------------------------------------------------
alter table public.app_settings enable row level security;       -- no policies: private
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security; -- no policies: RPC only
alter table public.wallet_entries enable row level security;      -- no policies: RPC only
alter table public.reward_catalog enable row level security;
alter table public.missions enable row level security;
alter table public.feed_events enable row level security;

create policy "members can view profiles" on public.profiles for select to authenticated using (true);
create policy "members update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "view own wallet" on public.wallets for select to authenticated
  using (owner_type = 'user' and owner_id = auth.uid());
create policy "view active rewards" on public.reward_catalog for select to authenticated using (active);
create policy "view own missions" on public.missions for select to authenticated using (creator_id = auth.uid());
create policy "view feed" on public.feed_events for select to authenticated using (true);

-- TABLE PRIVILEGES: clients may read a few tables; all writes go through RPCs
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.wallets, public.reward_catalog, public.missions, public.feed_events to authenticated;
grant update (display_name, bio, avatar_url) on public.profiles to authenticated;

-- FUNCTION PRIVILEGES --------------------------------------------------------
revoke execute on function public._post_transfer(uuid,uuid,bigint,public.transaction_type,text,uuid,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.check_tx_balanced() from public, anon, authenticated;

revoke execute on function public.create_mission(text,uuid,timestamptz) from public, anon;
revoke execute on function public.complete_mission(uuid) from public, anon;
revoke execute on function public.cancel_mission(uuid) from public, anon;
revoke execute on function public.transfer_vyr(text,bigint,text,text) from public, anon;
revoke execute on function public.my_history(int) from public, anon;
grant execute on function public.create_mission(text,uuid,timestamptz) to authenticated;
grant execute on function public.complete_mission(uuid) to authenticated;
grant execute on function public.cancel_mission(uuid) to authenticated;
grant execute on function public.transfer_vyr(text,bigint,text,text) to authenticated;
grant execute on function public.my_history(int) to authenticated;

-- REALTIME (live balance + live feed) ---------------------------------------
alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.feed_events;
