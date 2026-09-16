# Database Migrations — How It Works Now

We used to run SQL by hand on whatever machine needed a schema change. That caused drift — local DBs and prod ended up with different columns. We now use **node-pg-migrate** to track every schema change as a file in git.

## One-time setup (do this once)

Pull the latest `main`, then run:

```bash
cd backend
npx node-pg-migrate up --fake
```

`--fake` marks the existing migrations as already applied **without running them** — since your local DB already has this schema, we don't want to re-run `CREATE TABLE` on tables that already exist.

Check it worked:

```bash
psql -U postgres -d girvi_app -c "SELECT * FROM pgmigrations;"
```

You should see `1757500000000_baseline` and `1757500001000_add_missing_loan_columns` listed.

You only do this once, ever.

## Every time you pull changes

If someone else added a new migration file, apply it:

```bash
cd backend
npm run migrate:up
```

Safe to run anytime — it only applies migrations that haven't run yet on your machine.

## When YOU need to change the schema

**Don't** run `ALTER TABLE` / `CREATE TABLE` directly against any database anymore — not local, not prod.

1. Create a new migration file:
   ```bash
   npm run migrate:create describe_your_change
   ```
   This creates an empty timestamped file in `backend/migrations/`.

2. Open that file and write plain SQL, e.g.:
   ```sql
   ALTER TABLE public.loans ADD COLUMN lender_notes text;
   ```

3. Apply it locally to test:
   ```bash
   npm run migrate:up
   ```

4. Check it worked, then commit the migration file and push:
   ```bash
   git add backend/migrations/
   git commit -m "add lender_notes column to loans"
   git push
   ```

That's it — the deploy pipeline runs the migration on the VPS automatically. No SSH, no manual SQL on prod.

## Rules of thumb

- Never edit an old migration file once it's pushed and applied anywhere — write a new one instead, even to fix a mistake.
- Never run raw SQL directly against the VPS database. If it's not a migration file, it didn't happen (as far as the rest of the team knows).
- If `migrate:up` ever fails with something like `relation already exists`, stop and ask — it usually means the DB you're pointing at is out of sync with what git thinks has been applied, and needs a look before continuing.