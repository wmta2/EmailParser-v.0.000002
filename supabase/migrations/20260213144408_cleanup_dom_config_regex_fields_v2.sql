/*
  # Cleanup DOM Config - Remove Legacy Regex Fields

  ## Overview
  This migration cleans up the dom_config JSONB column to remove any legacy 'regex' 
  fields and ensures all field configurations use the correct structure with 'transform' 
  instead of 'regex'.

  ## Changes Made
  1. Update all dom_config entries to:
     - Remove 'regex' properties from field configurations
     - Ensure consistency in field structure (selector, attribute, transform)
     - Preserve empty objects as empty objects

  ## Important Notes
  - This migration ensures compatibility with the XPath-only parsing system
  - After this migration, all field configs will have: selector, attribute, transform (optional)
*/

-- Clean up dom_config by removing 'regex' fields and standardizing structure
UPDATE email_template_patterns
SET dom_config = (
  SELECT 
    CASE 
      WHEN dom_config = '{}'::jsonb THEN '{}'::jsonb
      ELSE (
        SELECT jsonb_object_agg(
          key,
          CASE 
            -- Keep orderItems structure as-is (it has its own schema)
            WHEN key = 'orderItems' THEN value
            -- For other fields, clean up structure by removing 'regex' and keeping only valid properties
            ELSE (
              SELECT jsonb_object_agg(subkey, subvalue)
              FROM jsonb_each(value) AS t(subkey, subvalue)
              WHERE subkey IN ('selector', 'attribute', 'transform', 'blockSelector', 'blockParser')
            )
          END
        )
        FROM jsonb_each(dom_config)
      )
    END
)
WHERE dom_config IS NOT NULL 
  AND dom_config != '{}'::jsonb
  AND EXISTS (
    SELECT 1 
    FROM jsonb_each(dom_config) AS t(key, value)
    WHERE key != 'orderItems' 
      AND value ? 'regex'
  );

-- Add helpful comment
COMMENT ON COLUMN email_template_patterns.dom_config IS 'XPath configuration for element selection. Each field contains: selector (XPath expression), attribute (optional HTML attribute to extract), and transform (optional transformation function).';
