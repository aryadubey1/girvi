-- Adds columns that already exist on the VPS/baseline schema but were
-- missing from this local DB (local DB predates these columns being added).

ALTER TABLE public.loans
    ADD COLUMN IF NOT EXISTS gold_weight numeric,
    ADD COLUMN IF NOT EXISTS gold_rate numeric,
    ADD COLUMN IF NOT EXISTS gold_value numeric,
    ADD COLUMN IF NOT EXISTS silver_weight numeric,
    ADD COLUMN IF NOT EXISTS silver_rate numeric,
    ADD COLUMN IF NOT EXISTS silver_value numeric,
    ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS gold_purity numeric,
    ADD COLUMN IF NOT EXISTS silver_purity numeric;

-- due_date is NOT NULL on the baseline with no default, so existing rows
-- need a value before we can enforce NOT NULL. Backfill from loan_date
-- (adjust the interval if your actual loan term differs) then lock it down.
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS due_date date;
UPDATE public.loans SET due_date = loan_date + INTERVAL '1 year' WHERE due_date IS NULL;
ALTER TABLE public.loans ALTER COLUMN due_date SET NOT NULL;
