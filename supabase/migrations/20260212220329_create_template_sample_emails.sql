/*
  # Create Template Sample Emails Table

  1. New Tables
    - `template_sample_emails`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key to email_template_patterns)
      - `name` (text) - Friendly name for the sample
      - `html_content` (text) - The complete HTML of the sample email
      - `subject` (text, nullable) - Email subject if available
      - `from_email` (text, nullable) - Sender email if available
      - `notes` (text, nullable) - User notes about this sample
      - `is_primary` (boolean, default false) - Flag for primary/default sample
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `template_sample_emails` table
    - Add policies for authenticated users to manage their template samples

  3. Indexes
    - Index on template_id for fast lookups
    - Index on is_primary for finding default samples
*/

-- Create template_sample_emails table
CREATE TABLE IF NOT EXISTS template_sample_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_template_patterns(id) ON DELETE CASCADE,
  name text NOT NULL,
  html_content text NOT NULL,
  subject text,
  from_email text,
  notes text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE template_sample_emails ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_sample_emails_template_id ON template_sample_emails(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sample_emails_is_primary ON template_sample_emails(is_primary);

-- RLS Policies
CREATE POLICY "Authenticated users can view template samples"
  ON template_sample_emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert template samples"
  ON template_sample_emails FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update template samples"
  ON template_sample_emails FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete template samples"
  ON template_sample_emails FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_sample_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_template_sample_emails_updated_at
  BEFORE UPDATE ON template_sample_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_template_sample_emails_updated_at();