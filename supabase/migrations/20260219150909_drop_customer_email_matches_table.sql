/*
  # Drop customer_email_matches table

  ## Summary
  Removes the customer_email_matches table entirely.

  ## Reason
  Customer matching no longer uses email addresses as a matching signal.
  Matching is now performed exclusively via:
    1. Supplier code matched against customer external_id
    2. Postcode + partial name/requester matching

  ## Changes
  - Drops the `customer_email_matches` table and all its associated policies and indexes
*/

DROP TABLE IF EXISTS customer_email_matches;
