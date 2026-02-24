import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { OrderwiseAdapter } from '../lib/erp/orderwiseAdapter';
import type { OrderwiseCustomer, OrderwiseDeliveryAddress } from '../lib/erp/types';

export interface CustomerSyncStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface AddressSyncStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface CustomerSyncLog {
  id: string;
  erp_destination_id: string;
  sync_type: 'manual' | 'scheduled';
  status: 'running' | 'completed' | 'failed';
  customers_fetched: number;
  customers_created: number;
  customers_updated: number;
  customers_skipped: number;
  addresses_fetched: number;
  addresses_created: number;
  addresses_updated: number;
  addresses_skipped: number;
  error_message?: string;
  error_details?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  last_modified_since?: string;
  created_at: string;
}

export interface CustomerSyncItem {
  id: string;
  sync_log_id: string;
  customer_id: string | null;
  external_id: string;
  action: 'created' | 'updated' | 'skipped';
  customer_snapshot: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

function buildCustomerFields(customer: OrderwiseCustomer) {
  return {
    name: customer.name,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    company: customer.company ?? null,
    account_number: customer.accountNumber,
    orderwise_id: customer.id ?? null,
    billing_name: customer.billingName ?? null,
    billing_address1: customer.billingAddress1 ?? null,
    billing_address2: customer.billingAddress2 ?? null,
    billing_address3: customer.billingAddress3 ?? null,
    billing_town: customer.billingTown ?? null,
    billing_county: customer.billingCounty ?? null,
    billing_postcode: customer.billingPostcode ?? null,
    billing_country: customer.billingCountry ?? null,
    billing_country_code: customer.billingCountryCode ?? null,
    billing_email: customer.billingEmail ?? null,
    billing_telephone: customer.billingTelephone ?? null,
    shipping_name: customer.shippingName ?? null,
    shipping_address1: customer.shippingAddress1 ?? null,
    shipping_address2: customer.shippingAddress2 ?? null,
    shipping_address3: customer.shippingAddress3 ?? null,
    shipping_town: customer.shippingTown ?? null,
    shipping_county: customer.shippingCounty ?? null,
    shipping_postcode: customer.shippingPostcode ?? null,
    shipping_country: customer.shippingCountry ?? null,
    shipping_country_code: customer.shippingCountryCode ?? null,
    shipping_email: customer.shippingEmail ?? null,
    shipping_telephone: customer.shippingTelephone ?? null,
    on_hold: customer.onHold ?? false,
    manual_on_hold: customer.manualOnHold ?? false,
    balance: customer.balance ?? null,
    credit_limit: customer.creditLimit ?? null,
    available_to_spend: customer.availableToSpend ?? null,
    open_orders_value: customer.openOrdersValue ?? null,
    over_credit_terms: customer.overCreditTerms ?? false,
    vat_number: customer.vatNumber ?? null,
    currency_id: customer.currencyId ?? null,
    price_list_id: customer.priceListId ?? null,
    nominal_code_id: customer.nominalCodeId ?? null,
    default_tax_code_id: customer.defaultTaxCodeId ?? null,
    last_amended_at: customer.lastAmendedDateTime ?? null,
  };
}

function buildCustomerSnapshot(customer: OrderwiseCustomer): Record<string, unknown> {
  return {
    id: customer.id,
    accountNumber: customer.accountNumber,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    billingName: customer.billingName,
    billingAddress1: customer.billingAddress1,
    billingAddress2: customer.billingAddress2,
    billingAddress3: customer.billingAddress3,
    billingTown: customer.billingTown,
    billingCounty: customer.billingCounty,
    billingPostcode: customer.billingPostcode,
    billingCountry: customer.billingCountry,
    billingCountryCode: customer.billingCountryCode,
    billingEmail: customer.billingEmail,
    billingTelephone: customer.billingTelephone,
    shippingName: customer.shippingName,
    shippingAddress1: customer.shippingAddress1,
    shippingAddress2: customer.shippingAddress2,
    shippingAddress3: customer.shippingAddress3,
    shippingTown: customer.shippingTown,
    shippingCounty: customer.shippingCounty,
    shippingPostcode: customer.shippingPostcode,
    shippingCountry: customer.shippingCountry,
    shippingCountryCode: customer.shippingCountryCode,
    shippingEmail: customer.shippingEmail,
    shippingTelephone: customer.shippingTelephone,
    onHold: customer.onHold,
    manualOnHold: customer.manualOnHold,
    balance: customer.balance,
    creditLimit: customer.creditLimit,
    availableToSpend: customer.availableToSpend,
    openOrdersValue: customer.openOrdersValue,
    overCreditTerms: customer.overCreditTerms,
    vatNumber: customer.vatNumber,
    currencyId: customer.currencyId,
    priceListId: customer.priceListId,
    nominalCodeId: customer.nominalCodeId,
    defaultTaxCodeId: customer.defaultTaxCodeId,
    lastAmendedDateTime: customer.lastAmendedDateTime,
    metadata: customer.metadata,
  };
}

async function recordSyncItem(
  syncLogId: string,
  customerId: string | null,
  externalId: string,
  action: 'created' | 'updated' | 'skipped',
  customerSnapshot: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  await supabase.from('customer_sync_items').insert({
    sync_log_id: syncLogId,
    customer_id: customerId,
    external_id: externalId,
    action,
    customer_snapshot: customerSnapshot,
    error_message: errorMessage ?? null,
  });
}

async function syncAddressesForCustomer(
  adapter: OrderwiseAdapter,
  credentials: Record<string, any>,
  customerId: string,
  orderwiseId: number,
  erpDestinationId: string,
  erpConfigurationId: string
): Promise<AddressSyncStats> {
  const stats: AddressSyncStats = { fetched: 0, created: 0, updated: 0, skipped: 0 };

  const fetchResult = await adapter.fetchCustomerDeliveryAddresses(
    credentials,
    orderwiseId,
    erpDestinationId,
    erpConfigurationId
  );

  if (!fetchResult.success || fetchResult.addresses.length === 0) {
    return stats;
  }

  const addresses = fetchResult.addresses;
  stats.fetched = addresses.length;

  for (const addr of addresses) {
    if (addr.id == null) {
      stats.skipped++;
      continue;
    }

    const externalId = String(addr.id);

    try {
      const { data: existing } = await supabase
        .from('customer_delivery_addresses')
        .select('id')
        .eq('customer_id', customerId)
        .eq('external_id', externalId)
        .maybeSingle();

      const fields = {
        name: addr.name ?? null,
        contact_name: addr.contactName ?? null,
        address1: addr.address1 ?? null,
        address2: addr.address2 ?? null,
        address3: addr.address3 ?? null,
        town: addr.town ?? null,
        county: addr.county ?? null,
        postcode: addr.postcode ?? null,
        country: addr.country ?? null,
        country_code: addr.countryCode ?? null,
        telephone: addr.telephone ?? null,
        email: addr.email ?? null,
        is_default: addr.isDefault ?? false,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('customer_delivery_addresses')
          .update(fields)
          .eq('id', existing.id);

        if (updateError) {
          stats.skipped++;
        } else {
          stats.updated++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('customer_delivery_addresses')
          .insert({
            customer_id: customerId,
            external_id: externalId,
            ...fields,
          });

        if (insertError) {
          stats.skipped++;
        } else {
          stats.created++;
        }
      }
    } catch {
      stats.skipped++;
    }
  }

  return stats;
}

export function useOrderwiseCustomerSync() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [stats, setStats] = useState<CustomerSyncStats>({
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
  });

  async function syncCustomers(
    erpDestinationId: string,
    isManual: boolean = true
  ): Promise<{ success: boolean; stats: CustomerSyncStats; addressStats?: AddressSyncStats; error?: string }> {
    setSyncing(true);
    setProgress('Initializing customer sync...');
    setStats({ fetched: 0, created: 0, updated: 0, skipped: 0 });

    let syncLogId: string | null = null;

    try {
      const { data: erpConfig, error: configError } = await supabase
        .from('erp_configurations')
        .select('*, erp_destinations!inner(*)')
        .eq('erp_destination_id', erpDestinationId)
        .maybeSingle();

      if (configError || !erpConfig) {
        throw new Error('ERP configuration not found');
      }

      const adapter = new OrderwiseAdapter();

      const { data: lastAmendedRow } = await supabase
        .from('customers')
        .select('last_amended_at')
        .not('last_amended_at', 'is', null)
        .order('last_amended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastModifiedSince = lastAmendedRow?.last_amended_at ?? null;

      const { data: syncLog, error: syncLogError } = await supabase
        .from('customer_sync_log')
        .insert({
          erp_destination_id: erpDestinationId,
          sync_type: isManual ? 'manual' : 'scheduled',
          status: 'running',
          started_at: new Date().toISOString(),
          last_modified_since: lastModifiedSince,
        })
        .select()
        .single();

      if (syncLogError || !syncLog) {
        throw new Error('Failed to create sync log');
      }

      syncLogId = syncLog.id;

      setProgress(
        lastModifiedSince
          ? `Fetching customers amended after ${new Date(lastModifiedSince).toLocaleString()}...`
          : 'Fetching all customers from Orderwise...'
      );

      const fetchResult = await adapter.fetchCustomers(
        erpConfig.credentials,
        erpDestinationId,
        erpConfig.id,
        lastModifiedSince ?? undefined
      );

      if (!fetchResult.success) {
        throw new Error(fetchResult.errorMessage || 'Failed to fetch customers');
      }

      const customers = fetchResult.customers;
      setStats(prev => ({ ...prev, fetched: customers.length }));
      setProgress(`Processing ${customers.length} customers...`);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const addrTotals: AddressSyncStats = { fetched: 0, created: 0, updated: 0, skipped: 0 };

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        setProgress(`Processing customer ${i + 1} of ${customers.length}...`);
        const snapshot = buildCustomerSnapshot(customer);

        if (!customer.accountNumber || !customer.name) {
          skipped++;
          await recordSyncItem(
            syncLogId!,
            null,
            customer.accountNumber || 'unknown',
            'skipped',
            snapshot,
            'Missing account number or name'
          );
          setStats({ fetched: customers.length, created, updated, skipped });
          continue;
        }

        try {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, last_amended_at')
            .eq('external_id', customer.accountNumber)
            .maybeSingle();

          let syncedCustomerId: string | null = null;

          if (existingCustomer) {
            const storedAmended = existingCustomer.last_amended_at
              ? new Date(existingCustomer.last_amended_at).getTime()
              : 0;
            const incomingAmended = customer.lastAmendedDateTime
              ? new Date(customer.lastAmendedDateTime).getTime()
              : null;

            if (incomingAmended !== null && incomingAmended <= storedAmended) {
              skipped++;
              await recordSyncItem(
                syncLogId!,
                existingCustomer.id,
                customer.accountNumber,
                'skipped',
                snapshot,
                'No changes detected (last amended date unchanged)'
              );
              setStats({ fetched: customers.length, created, updated, skipped });
              continue;
            }

            const { error: updateError } = await supabase
              .from('customers')
              .update({
                ...buildCustomerFields(customer),
                metadata: {
                  orderwise: customer.metadata,
                  last_synced_from_orderwise: new Date().toISOString(),
                },
              })
              .eq('id', existingCustomer.id);

            if (updateError) {
              skipped++;
              await recordSyncItem(
                syncLogId!,
                existingCustomer.id,
                customer.accountNumber,
                'skipped',
                snapshot,
                updateError.message
              );
            } else {
              updated++;
              syncedCustomerId = existingCustomer.id;
              await recordSyncItem(
                syncLogId!,
                existingCustomer.id,
                customer.accountNumber,
                'updated',
                snapshot
              );
            }
          } else {
            const { data: insertedCustomer, error: insertError } = await supabase
              .from('customers')
              .insert({
                external_id: customer.accountNumber,
                ...buildCustomerFields(customer),
                metadata: {
                  orderwise: customer.metadata,
                  last_synced_from_orderwise: new Date().toISOString(),
                },
              })
              .select('id')
              .single();

            if (insertError) {
              skipped++;
              await recordSyncItem(
                syncLogId!,
                null,
                customer.accountNumber,
                'skipped',
                snapshot,
                insertError.message
              );
            } else {
              created++;
              syncedCustomerId = insertedCustomer?.id ?? null;
              await recordSyncItem(
                syncLogId!,
                insertedCustomer?.id ?? null,
                customer.accountNumber,
                'created',
                snapshot
              );
            }
          }

          if (syncedCustomerId && customer.id != null) {
            setProgress(`Fetching delivery addresses for customer ${i + 1} of ${customers.length}...`);
            const addrResult = await syncAddressesForCustomer(
              adapter, erpConfig.credentials, syncedCustomerId,
              customer.id, erpDestinationId, erpConfig.id
            );
            addrTotals.fetched += addrResult.fetched;
            addrTotals.created += addrResult.created;
            addrTotals.updated += addrResult.updated;
            addrTotals.skipped += addrResult.skipped;
          }

          setStats({ fetched: customers.length, created, updated, skipped });
        } catch (err) {
          skipped++;
          await recordSyncItem(
            syncLogId!,
            null,
            customer.accountNumber,
            'skipped',
            snapshot,
            err instanceof Error ? err.message : 'Unknown error'
          );
          setStats({ fetched: customers.length, created, updated, skipped });
        }
      }

      await supabase
        .from('customer_sync_log')
        .update({
          status: 'completed',
          customers_fetched: customers.length,
          customers_created: created,
          customers_updated: updated,
          customers_skipped: skipped,
          addresses_fetched: addrTotals.fetched,
          addresses_created: addrTotals.created,
          addresses_updated: addrTotals.updated,
          addresses_skipped: addrTotals.skipped,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId);

      setProgress('Customer sync completed successfully!');

      return {
        success: true,
        stats: { fetched: customers.length, created, updated, skipped },
        addressStats: addrTotals,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

      if (syncLogId) {
        await supabase
          .from('customer_sync_log')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: { error: String(err) },
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      }

      setProgress(`Error: ${errorMessage}`);

      return {
        success: false,
        stats,
        error: errorMessage,
      };
    } finally {
      setSyncing(false);
    }
  }

  async function fetchSyncLogs(
    erpDestinationId: string,
    limit: number = 10
  ): Promise<CustomerSyncLog[]> {
    const { data, error } = await supabase
      .from('customer_sync_log')
      .select('*')
      .eq('erp_destination_id', erpDestinationId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as CustomerSyncLog[];
  }

  async function fetchSyncItems(
    syncLogId: string,
    actionFilter?: 'created' | 'updated' | 'skipped'
  ): Promise<CustomerSyncItem[]> {
    let query = supabase
      .from('customer_sync_items')
      .select('*')
      .eq('sync_log_id', syncLogId)
      .order('created_at', { ascending: true });

    if (actionFilter) {
      query = query.eq('action', actionFilter);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data as CustomerSyncItem[];
  }

  return {
    syncing,
    progress,
    stats,
    syncCustomers,
    fetchSyncLogs,
    fetchSyncItems,
  };
}
