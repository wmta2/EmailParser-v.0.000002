/*
  # Optimize RLS Policies - Auth Function Performance

  1. Purpose
    - Replace auth.uid() and auth.role() calls with (select auth.uid()) and (select auth.role())
    - This prevents re-evaluation of auth functions for each row, improving query performance

  2. Tables Affected
    - user_profiles
    - invitations
    - email_template_patterns
    - sales_channels
    - channel_configurations
    - erp_destinations
    - erp_configurations
    - erp_services
    - order_exports
    - erp_sync_log
    - erp_api_logs
    - customers
    - customer_source_mappings
    - channel_sync_log
    - channel_raw_imports
    - channel_customers
    - customer_delivery_addresses
    - delivery_address_sync_log
    - delivery_address_sync_items

  3. Security
    - No changes to actual security logic, only performance optimization
*/

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- invitations policies
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
CREATE POLICY "Admins can view all invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- email_template_patterns policies
DROP POLICY IF EXISTS "Admins can view all templates" ON public.email_template_patterns;
CREATE POLICY "Admins can view all templates"
  ON public.email_template_patterns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- sales_channels policies
DROP POLICY IF EXISTS "Admins can manage sales channels" ON public.sales_channels;
CREATE POLICY "Admins can manage sales channels"
  ON public.sales_channels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert sales channels" ON public.sales_channels;
CREATE POLICY "Admins can insert sales channels"
  ON public.sales_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update sales channels" ON public.sales_channels;
CREATE POLICY "Admins can update sales channels"
  ON public.sales_channels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete sales channels" ON public.sales_channels;
CREATE POLICY "Admins can delete sales channels"
  ON public.sales_channels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- channel_configurations policies
DROP POLICY IF EXISTS "Admins can view channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can view channel configs"
  ON public.channel_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can insert channel configs"
  ON public.channel_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can update channel configs"
  ON public.channel_configurations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can delete channel configs"
  ON public.channel_configurations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- erp_destinations policies
DROP POLICY IF EXISTS "Authenticated users can view ERP destinations" ON public.erp_destinations;
CREATE POLICY "Authenticated users can view ERP destinations"
  ON public.erp_destinations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert ERP destinations" ON public.erp_destinations;
CREATE POLICY "Authenticated users can insert ERP destinations"
  ON public.erp_destinations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update ERP destinations" ON public.erp_destinations;
CREATE POLICY "Authenticated users can update ERP destinations"
  ON public.erp_destinations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete ERP destinations" ON public.erp_destinations;
CREATE POLICY "Authenticated users can delete ERP destinations"
  ON public.erp_destinations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- erp_configurations policies
DROP POLICY IF EXISTS "Authenticated users can view ERP configurations" ON public.erp_configurations;
CREATE POLICY "Authenticated users can view ERP configurations"
  ON public.erp_configurations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert ERP configurations" ON public.erp_configurations;
CREATE POLICY "Authenticated users can insert ERP configurations"
  ON public.erp_configurations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update ERP configurations" ON public.erp_configurations;
CREATE POLICY "Authenticated users can update ERP configurations"
  ON public.erp_configurations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete ERP configurations" ON public.erp_configurations;
CREATE POLICY "Authenticated users can delete ERP configurations"
  ON public.erp_configurations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- erp_services policies
DROP POLICY IF EXISTS "Authenticated users can view ERP services" ON public.erp_services;
CREATE POLICY "Authenticated users can view ERP services"
  ON public.erp_services FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert ERP services" ON public.erp_services;
CREATE POLICY "Authenticated users can insert ERP services"
  ON public.erp_services FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update ERP services" ON public.erp_services;
CREATE POLICY "Authenticated users can update ERP services"
  ON public.erp_services FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete ERP services" ON public.erp_services;
CREATE POLICY "Authenticated users can delete ERP services"
  ON public.erp_services FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- order_exports policies
DROP POLICY IF EXISTS "Authenticated users can view order exports" ON public.order_exports;
CREATE POLICY "Authenticated users can view order exports"
  ON public.order_exports FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert order exports" ON public.order_exports;
CREATE POLICY "Authenticated users can insert order exports"
  ON public.order_exports FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update order exports" ON public.order_exports;
CREATE POLICY "Authenticated users can update order exports"
  ON public.order_exports FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete order exports" ON public.order_exports;
CREATE POLICY "Authenticated users can delete order exports"
  ON public.order_exports FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- erp_sync_log policies
DROP POLICY IF EXISTS "Authenticated users can view ERP sync logs" ON public.erp_sync_log;
CREATE POLICY "Authenticated users can view ERP sync logs"
  ON public.erp_sync_log FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert ERP sync logs" ON public.erp_sync_log;
CREATE POLICY "Authenticated users can insert ERP sync logs"
  ON public.erp_sync_log FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update ERP sync logs" ON public.erp_sync_log;
CREATE POLICY "Authenticated users can update ERP sync logs"
  ON public.erp_sync_log FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete ERP sync logs" ON public.erp_sync_log;
CREATE POLICY "Authenticated users can delete ERP sync logs"
  ON public.erp_sync_log FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- erp_api_logs policies
DROP POLICY IF EXISTS "Admins can view API logs" ON public.erp_api_logs;
CREATE POLICY "Admins can view API logs"
  ON public.erp_api_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- customers policies
DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;
CREATE POLICY "Admins can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert customers" ON public.customers;
CREATE POLICY "Admins can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- customer_source_mappings policies
DROP POLICY IF EXISTS "Admins can view customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Admins can view customer mappings"
  ON public.customer_source_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Users can view customer mappings"
  ON public.customer_source_mappings FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Admins can insert customer mappings"
  ON public.customer_source_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Admins can update customer mappings"
  ON public.customer_source_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Admins can delete customer mappings"
  ON public.customer_source_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- channel_sync_log policies
DROP POLICY IF EXISTS "Admins can view sync logs" ON public.channel_sync_log;
CREATE POLICY "Admins can view sync logs"
  ON public.channel_sync_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view sync logs" ON public.channel_sync_log;
CREATE POLICY "Users can view sync logs"
  ON public.channel_sync_log FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert sync logs" ON public.channel_sync_log;
CREATE POLICY "Admins can insert sync logs"
  ON public.channel_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update sync logs" ON public.channel_sync_log;
CREATE POLICY "Admins can update sync logs"
  ON public.channel_sync_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- channel_raw_imports policies
DROP POLICY IF EXISTS "Admins can view raw imports" ON public.channel_raw_imports;
CREATE POLICY "Admins can view raw imports"
  ON public.channel_raw_imports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view raw imports" ON public.channel_raw_imports;
CREATE POLICY "Users can view raw imports"
  ON public.channel_raw_imports FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert raw imports" ON public.channel_raw_imports;
CREATE POLICY "Admins can insert raw imports"
  ON public.channel_raw_imports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update raw imports" ON public.channel_raw_imports;
CREATE POLICY "Admins can update raw imports"
  ON public.channel_raw_imports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- channel_customers policies
DROP POLICY IF EXISTS "Admins can view channel customers" ON public.channel_customers;
CREATE POLICY "Admins can view channel customers"
  ON public.channel_customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view channel customers" ON public.channel_customers;
CREATE POLICY "Authenticated users can view channel customers"
  ON public.channel_customers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert channel customers" ON public.channel_customers;
CREATE POLICY "Admins can insert channel customers"
  ON public.channel_customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update channel customers" ON public.channel_customers;
CREATE POLICY "Admins can update channel customers"
  ON public.channel_customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete channel customers" ON public.channel_customers;
CREATE POLICY "Admins can delete channel customers"
  ON public.channel_customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- customer_delivery_addresses policies
DROP POLICY IF EXISTS "Authenticated users can read customer delivery addresses" ON public.customer_delivery_addresses;
CREATE POLICY "Authenticated users can read customer delivery addresses"
  ON public.customer_delivery_addresses FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert customer delivery addresses" ON public.customer_delivery_addresses;
CREATE POLICY "Authenticated users can insert customer delivery addresses"
  ON public.customer_delivery_addresses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update customer delivery addresses" ON public.customer_delivery_addresses;
CREATE POLICY "Authenticated users can update customer delivery addresses"
  ON public.customer_delivery_addresses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- delivery_address_sync_log policies
DROP POLICY IF EXISTS "Authenticated users can read delivery address sync log" ON public.delivery_address_sync_log;
CREATE POLICY "Authenticated users can read delivery address sync log"
  ON public.delivery_address_sync_log FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert delivery address sync log" ON public.delivery_address_sync_log;
CREATE POLICY "Authenticated users can insert delivery address sync log"
  ON public.delivery_address_sync_log FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update delivery address sync log" ON public.delivery_address_sync_log;
CREATE POLICY "Authenticated users can update delivery address sync log"
  ON public.delivery_address_sync_log FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- delivery_address_sync_items policies
DROP POLICY IF EXISTS "Authenticated users can read delivery address sync items" ON public.delivery_address_sync_items;
CREATE POLICY "Authenticated users can read delivery address sync items"
  ON public.delivery_address_sync_items FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert delivery address sync items" ON public.delivery_address_sync_items;
CREATE POLICY "Authenticated users can insert delivery address sync items"
  ON public.delivery_address_sync_items FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);
