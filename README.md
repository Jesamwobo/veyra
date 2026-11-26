# Veyra MVP

Make progress. Earn value. Help others. Build together.

A small, real version of Veyra for testing with friends: accounts, shared wallets, a
double-entry ledger, personal missions with fixed rewards, VYR transfers, a live
activity feed and a leaderboard.

## 1. Create the Supabase project
1. Go to supabase.com, create a free project (a dev/test one).
2. Open **SQL Editor**, paste all of `supabase/migration.sql`, and run it once.
3. Open **Authentication → Providers → Email** and turn **off** "Confirm email"
   (this makes sign-up instant for friends; turn it back on later).
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
   (Never put the `service_role` key in this app.)

## 2. Run it locally
```bash
cp .env.example .env.local      # paste your URL and anon key
npm install
npm run dev                     # http://localhost:3000
```

## 3. Smoke test (5 minutes)
1. Create two accounts (use a private window for the second). Each starts with 100 VYR.
2. On account A add a mission, tap **Done**: balance goes up by the catalogue reward.
3. Send VYR from A to B: B's balance updates live and both see it in **Feed**.
4. In the Supabase SQL Editor run this. It must return no rows:
   `select transaction_id from wallet_entries group by 1 having sum(amount) <> 0;`
5. Check the books: `select sum(available_balance) from wallets;` must equal 0
   (the platform wallet holds the negative of everything issued).

## 4. Put it online for friends (Vercel)
1. Push this folder to a GitHub repo.
2. On vercel.com choose **Add New → Project**, import the repo.
3. Add the two environment variables from `.env.example`, then deploy.
4. In Supabase **Authentication → URL Configuration**, set Site URL to your Vercel URL.
5. Send friends the link. On a phone they can use "Add to Home Screen" to install it.

## Tuning (SQL Editor)
```sql
update app_settings set daily_issuance_cap = 300, welcome_grant = 50;
update reward_catalog set reward_amount = 30 where category='personal' and difficulty='easy';
```

## What's intentionally not here yet
Job board and escrow, communities and treasury, challenges, reputation levels,
notifications, admin dashboard, audit log UI. The enums and ledger already support them.
Build them only after friends show they use the core loop.

## Known MVP limits
- Personal missions are self-confirmed, so the daily cap (500 VYR) is the only guard.
- The feed is public to all signed-in members, including transfer amounts.
- Usernames are fixed at sign-up (a collision gets a random suffix).
