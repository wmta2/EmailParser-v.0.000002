/*
  # Create Email Template Patterns Table

  ## Overview
  This migration creates a flexible template management system for parsing email orders.
  Templates define how to detect and extract data from different email formats.

  ## New Tables
  
  ### `email_template_patterns`
  Stores reusable email parsing templates with detection and extraction rules.
  
  - `id` (uuid, primary key) - Unique identifier
  - `template_name` (text, not null) - Human-readable name (e.g., "Sysco Order Format")
  - `template_type` (text, unique, not null) - Unique identifier (e.g., "sysco_v1")
  - `provider_name` (text, not null) - Email provider/vendor name
  - `detection_keywords` (jsonb, not null) - Array of keywords to identify this template
  - `confidence_threshold` (integer, default 50) - Minimum confidence score (0-100) to match
  - `order_number_pattern` (jsonb) - Start and end patterns for order number extraction
  - `delivery_address_pattern` (jsonb) - Start and end patterns for delivery address
  - `billing_address_pattern` (jsonb) - Start and end patterns for billing address
  - `notes_pattern` (jsonb) - Start and end patterns for notes/special instructions
  - `requester_pattern` (jsonb) - Start and end patterns for requester name/email
  - `table_header_keywords` (jsonb, not null) - Array of keywords indicating table start
  - `column_mapping` (jsonb, not null) - Maps column indices to field types
  - `priority` (integer, default 50) - Higher priority templates are tried first
  - `active` (boolean, default true) - Enable/disable template
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  1. Enable RLS on email_template_patterns
  2. Admin users can manage all templates (full CRUD)
  3. Regular users can only read active templates
  
  ## Notes
  
  - Pattern fields use JSONB to store { start: "regex", end: "regex" } objects
  - Column mapping JSONB format: { "0": "product_code", "1": "product_name", ... }
  - Detection keywords help identify which template applies to an email
  - Priority determines order of template matching (highest first)
*/

-- Create email_template_patterns table
CREATE TABLE IF NOT EXISTS email_template_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  detection_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_threshold integer NOT NULL DEFAULT 50 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  order_number_pattern jsonb,
  delivery_address_pattern jsonb,
  billing_address_pattern jsonb,
  notes_pattern jsonb,
  requester_pattern jsonb,
  table_header_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_patterns_active ON email_template_patterns(active);
CREATE INDEX IF NOT EXISTS idx_template_patterns_priority ON email_template_patterns(priority DESC);
CREATE INDEX IF NOT EXISTS idx_template_patterns_type ON email_template_patterns(template_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_template_patterns_updated_at
  BEFORE UPDATE ON email_template_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE email_template_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin users can do everything
CREATE POLICY "Admins can view all templates"
  ON email_template_patterns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert templates"
  ON email_template_patterns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update templates"
  ON email_template_patterns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete templates"
  ON email_template_patterns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Regular users can view active templates (for email parsing)
CREATE POLICY "Users can view active templates"
  ON email_template_patterns
  FOR SELECT
  TO authenticated
  USING (active = true);