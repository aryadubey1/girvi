# Database Migrations — How It Works Now

We used to run SQL by hand on whatever machine needed a schema change. That caused drift — local DBs and prod ended up with different columns. We now use **node-pg-migrate** to track every schema change as a file in git.

There are only two commands you need.

## `npm run migrate:create describe_your_change`

Use this **only when you're the one making a schema change.** It creates an empty timestamped file in `backend/migrations/`. Open it and write the SQL yourself, e.g.:

```sql
ALTER TABLE public.loans ADD COLUMN lender_notes text;
```

## `npm run migrate:up`

Use this to **apply** migrations — both your own new one (to test it locally) and any pulled from a collaborator.

- After creating a migration → run this to apply and test it locally
- After `git pull` and someone else added a migration → run this, it applies whatever's new and skips whatever's already applied
- Always safe to run — does nothing if there's nothing new

## The full loop when you change the schema

```bash
npm run migrate:create describe_your_change   # 1. create the file
# 2. write the SQL inside it
npm run migrate:up                             # 3. apply + test locally
git add backend/migrations/
git commit -m "describe your change"
git push                                        # 4. deploy applies it to the VPS automatically
```

## The full loop when you just pull someone else's change

```bash
git pull
cd backend
npm run migrate:up
```

That's the whole thing.

## Two databases now exist

Since we added test accounts, there are two separate databases:

- **prod** (`girvi_db` on VPS / `girvi_app` locally) — real business data
- **sandbox** (`girvi_db_sandbox` on VPS / `girvi_app_sandbox` locally) — isolated fake data for testing, used by test accounts

`npm run migrate:up` only applies to **prod** (it reads `DATABASE_URL` from `.env`). If you change the schema, the sandbox DB needs the same migration applied separately:

```bash
DATABASE_URL=<sandbox connection string> npx node-pg-migrate up
```

Ask Arya for the sandbox connection string if you need it — don't guess it.

## Rules of thumb

- Never edit an old migration file once it's pushed and applied anywhere — write a new one instead, even to fix a mistake.
- Never run raw SQL directly against the VPS database. If it's not a migration file, it didn't happen (as far as the rest of the team knows).
- If `migrate:up` ever fails with something like `relation already exists`, stop and ask — it usually means the DB you're pointing at is out of sync with what git thinks has been applied.
- If `migrate:up` says "No migrations to run!" but you expected changes, check your terminal doesn't have a leftover `DATABASE_URL` environment variable overriding `.env` — this actually happened during setup once. Run `node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"` to see what it's really pointing at.