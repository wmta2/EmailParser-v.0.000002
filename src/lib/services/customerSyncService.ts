import { supabase } from '../supabase';
import { OrderwiseAdapter } from '../erp/orderwiseAdapter';
import type { OrderwiseCustomer, OrderwiseDeliveryAddress } from '../erp/types';

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

export function buildCustomerFields(customer: OrderwiseCustomer) {
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

export function buildCustomerSnapshot(customer: OrderwiseCustomer): Record<string, unknown> {
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

export async function upsertCustomer(
  customer: OrderwiseCustomer,
  lastModifiedSince: string | null
): Promise<{
  action: 'created' | 'updated' | 'skipped';
  customerId: string | null;
  error?: string;
}> {
  if (!customer.accountNumber || !customer.name) {
    return {
      action: 'skipped',
      customerId: null,
      error: 'Missing account number or name'
    };
  }

  try {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, last_amended_at')
      .eq('external_id', customer.accountNumber)
      .maybeSingle();

    if (existingCustomer) {
      const storedAmended = existingCustomer.last_amended_at
        ? new Date(existingCustomer.last_amended_at).getTime()
        : 0;
      const incomingAmended = customer.lastAmendedDateTime
        ? new Date(customer.lastAmendedDateTime).getTime()
        : null;

      if (incomingAmended !== null && incomingAmended <= storedAmended) {
        return {
          action: 'skipped',
          customerId: existingCustomer.id,
          error: 'No changes detected (last amended date unchanged)'
        };
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
        return {
          action: 'skipped',
          customerId: existingCustomer.id,
          error: updateError.message
        };
      }

      return {
        action: 'updated',
        customerId: existingCustomer.id
      };
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
        return {
          action: 'skipped',
          customerId: null,
          error: insertError.message
        };
      }

      return {
        action: 'created',
        customerId: insertedCustomer?.id ?? null
      };
    }
  } catch (err) {
    return {
      action: 'skipped',
      customerId: null,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

export async function syncAddressesForCustomer(
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
