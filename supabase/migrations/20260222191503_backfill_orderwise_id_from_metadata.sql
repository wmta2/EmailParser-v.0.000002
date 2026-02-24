/*
  # Backfill orderwise_id from existing metadata

  1. Changes
    - Populate `orderwise_id` column from existing `metadata->'orderwise'->'id'` values
    - Only updates customers that have this metadata field set

  2. Purpose
    - Ensures existing customers synced from Orderwise have their numeric ID available
    - Enables delivery address sync for previously synced customers
*/

UPDATE customers
SET orderwise_id = (metadata->'orderwise'->>'id')::integer
WHERE metadata->'orderwise'->>'id' IS NOT NULL
  AND orderwise_id IS NULL;
