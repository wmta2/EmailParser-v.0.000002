/*
  # Add DOM Parsing Configuration Support

  1. Changes
    - Add `parsing_method` column to distinguish between regex and DOM parsing
    - Add `dom_config` column to store DOM selector configurations
    
  2. Details
    - `parsing_method`: Text column with values 'regex' or 'dom' (defaults to 'regex' for backward compatibility)
    - `dom_config`: JSONB column to store CSS selectors, transforms, and other DOM-specific configuration
    
  3. Notes
    - Existing templates will default to 'regex' method
    - DOM config structure supports:
      - Field-level selectors (orderNumber, deliveryAddress, etc.)
      - Table/item extraction configuration
      - Transform functions for data processing
      - Block parsers for structured data
*/

-- Add parsing_method column with default value for backward compatibility
ALTER TABLE email_template_patterns 
ADD COLUMN IF NOT EXISTS parsing_method text DEFAULT 'regex' CHECK (parsing_method IN ('regex', 'dom'));

-- Add dom_config column to store DOM selector configurations
ALTER TABLE email_template_patterns 
ADD COLUMN IF NOT EXISTS dom_config jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN email_template_patterns.parsing_method IS 'Parsing method: regex (pattern-based) or dom (CSS selector-based)';
COMMENT ON COLUMN email_template_patterns.dom_config IS 'DOM selector configuration for CSS-based parsing (used when parsing_method = dom)';

-- Update the dom-test template to use DOM parsing method
UPDATE email_template_patterns 
SET parsing_method = 'dom'
WHERE template_type = 'dom-test';
