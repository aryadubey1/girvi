-- Determines which database a user's session connects to: 'prod' (real
-- business data) or 'sandbox' (isolated test data). Defaults to 'prod' so
-- existing accounts are unaffected.

ALTER TABLE public.users
    ADD COLUMN db_target character varying(20) NOT NULL DEFAULT 'prod';

ALTER TABLE public.users
    ADD CONSTRAINT users_db_target_check CHECK (db_target IN ('prod', 'sandbox'));
