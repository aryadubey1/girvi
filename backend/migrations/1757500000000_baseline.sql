-- Baseline migration: snapshot of production schema as of 2026-09-10
-- This represents the schema BEFORE node-pg-migrate was introduced.
-- It is marked as already-applied on the VPS (via --fake) since those
-- tables already exist there. On any machine where these tables do NOT
-- yet exist (fresh local DB), running the normal migrate command will
-- create them from scratch.

--
-- Table: customers
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    address text,
    photo_path text,
    created_at timestamp without time zone DEFAULT now(),
    aadhar_number character varying(12),
    pan_number character varying(10),
    email character varying(255)
);

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;

--
-- Table: loan_photos
--

CREATE TABLE public.loan_photos (
    id integer NOT NULL,
    loan_id integer NOT NULL,
    photo_path text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.loan_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.loan_photos_id_seq OWNED BY public.loan_photos.id;

--
-- Table: loans
--

CREATE TABLE public.loans (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    original_principal numeric(12,2) NOT NULL,
    outstanding_principal numeric(12,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    loan_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    interest_shortfall numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    gold_weight numeric,
    gold_rate numeric,
    gold_value numeric,
    silver_weight numeric,
    silver_rate numeric,
    silver_value numeric,
    is_deleted boolean DEFAULT false,
    due_date date NOT NULL,
    gold_purity numeric,
    silver_purity numeric
);

CREATE SEQUENCE public.loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.loans_id_seq OWNED BY public.loans.id;

--
-- Table: payments
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    loan_id integer NOT NULL,
    payment_date date NOT NULL,
    amount_paid numeric(12,2) NOT NULL,
    interest_component numeric(12,2) NOT NULL,
    principal_component numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;

--
-- Defaults (link sequences to columns)
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);
ALTER TABLE ONLY public.loan_photos ALTER COLUMN id SET DEFAULT nextval('public.loan_photos_id_seq'::regclass);
ALTER TABLE ONLY public.loans ALTER COLUMN id SET DEFAULT nextval('public.loans_id_seq'::regclass);
ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);

--
-- Primary keys
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.loan_photos
    ADD CONSTRAINT loan_photos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

--
-- Foreign keys
--

ALTER TABLE ONLY public.loan_photos
    ADD CONSTRAINT loan_photos_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id);

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id);
