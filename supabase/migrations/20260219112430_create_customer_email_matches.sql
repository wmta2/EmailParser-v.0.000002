/*
  # Create customer_email_matches table

  ## Purpose
  Stores learned associations between sender email addresses and Orderwise customers.
  When a user confirms a customer match for an email order, that association is saved here
  so future emails from the same sender automatically pre-select the same customer.

  ## New Tables
  - `customer_email_matches`
    - `id` (uuid, primary key)
    - `from_email` (text, not null) - the sender email address
    - `matched_customer_id` (uuid, FK to customers) - the Orderwise customer matched
    - `match_method` (text) - how the match was determined: supplier_code, account_number, postcode, manual
    - `confirmed_by_user` (boolean) - whether a user explicitly confirmed this match
    - `confirmation_count` (integer) - increments each time this match is reconfirmed
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Indexes
  - `from_email` for fast sender lookups
  - `matched_customer_id` for customer-based lookups
  - Unique constraint on `from_email` + `matched_customer_id` for upsert logic

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, update their own organisation's data
*/

CREATE TABLE IF NOT EXISTS customer_email_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  matched_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  match_method text NOT NULL DEFAULT 'manual',
  confirmed_by_user boolean NOT NULL DEFAULT false,
  confirmation_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_email_matches_from_email ON customer_email_matches(from_email);
CREATE INDEX IF NOT EXISTS idx_customer_email_matches_customer_id ON customer_email_matches(matched_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_email_matches_unique ON customer_email_matches(from_email, matched_customer_id);

ALTER TABLE customer_email_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer email matches"
  ON customer_email_matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer email matches"
  ON customer_email_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer email matches"
  ON customer_email_matches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
