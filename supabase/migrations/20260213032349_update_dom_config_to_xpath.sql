-- Update DOM Configuration to XPath
-- Changes: Update documentation to reflect XPath usage instead of CSS selectors
-- DOM config now uses XPath expressions for robust label-based selection

-- Update comment for dom_config to reflect XPath usage
COMMENT ON COLUMN email_template_patterns.dom_config IS 'DOM XPath configuration for element selection (used when parsing_method = dom). Uses XPath expressions for robust label-based extraction.';

-- Update comment for parsing_method
COMMENT ON COLUMN email_template_patterns.parsing_method IS 'Parsing method: regex (legacy pattern-based) or dom (XPath-based element selection)';
