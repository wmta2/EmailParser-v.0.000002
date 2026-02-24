/*
  # Add Customer Sync Service to Orderwise ERP

  ## Overview
  This migration adds a new service record for customer synchronization in the Orderwise ERP system.

  ## Changes Made

  ### 1. Insert Customer Sync Service
    - Adds 'customer-sync' service to erp_services table
    - Links to Orderwise ERP destination
    - Service is enabled by default
    - Allows users to toggle automatic daily customer sync

  ## Service Details
    - **Service Slug**: customer-sync
    - **Service Name**: Customer Sync
    - **Description**: Automatically sync customer data from Orderwise daily. Updates existing customers and creates new ones based on account numbers.
    - **Enabled by Default**: true

  ## Notes
    - This service works alongside the scheduled Edge Function (orderwise-customer-sync)
    - Manual sync is always available regardless of service status
    - Service toggle only affects automatic daily sync
*/

-- Insert customer sync service for Orderwise
INSERT INTO erp_services (
  erp_destination_id,
  service_slug,
  service_name,
  description,
  enabled
)
SELECT
  id,
  'customer-sync',
  'Customer Sync',
  'Automatically sync customer data from Orderwise daily. Updates existing customers and creates new ones based on account numbers.',
  true
FROM erp_destinations
WHERE slug = 'orderwise'
ON CONFLICT DO NOTHING;
