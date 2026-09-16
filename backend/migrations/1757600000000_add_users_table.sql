-- Adds real user accounts, replacing the single shared APP_PASSWORD login.

CREATE TABLE public.users (
    id serial PRIMARY KEY,
    username character varying(50) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
