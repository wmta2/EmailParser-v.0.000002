/*
  # Add supplier_code_pattern to email_template_patterns table

  1. Changes
    - Add `supplier_code_pattern` column to `email_template_patterns` table (JSONB, nullable)
    - This field will store the pattern for extracting supplier codes from emails
  
  2. Notes
    - Field is nullable as not all templates may have supplier code extraction
    - Uses JSONB type to store {start: string, end: string} pattern object
*/

-- Add supplier_code_pattern column to email_template_patterns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_template_patterns' AND column_name = 'supplier_code_pattern'
  ) THEN
    ALTER TABLE email_template_patterns ADD COLUMN supplier_code_pattern JSONB;
  END IF;
END $$;
