import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderwiseCustomer {
  id?: number;
  accountNumber: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  shippingName?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingAddress3?: string;
  shippingTown?: string;
  shippingCounty?: string;
  shippingPostcode?: string;
  shippingCountry?: string;
  shippingCountryCode?: string;
  shippingEmail?: string;
  shippingTelephone?: string;
  metadata?: any;
}

interface OrderwiseDeliveryAddress {
  id?: number;
  name?: string;
  contactName?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  telephone?: string;
  email?: string;
  isDefault?: boolean;
  metadata?: any;
}

interface AddressSyncStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
}

async function authenticateOrderwise(
  baseUrl: string,
  username: string,
  password: string,
  environment: string
): Promise<string> {
  let domain = baseUrl.replace(/\/+$/, '');
  domain = domain.replace(/\/(OWAPI|OWAPISB)$/i, '');
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  const authUrl = `${domain}${apiPath}/token/gettoken`;

  const encoded = btoa(`${username}:${password}`);

  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${encoded}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Authentication failed (${response.status}): ${text}`);
  }

  const text = await response.text();
  return text.replace(/^"|"$/g, '');
}

async function fetchCustomersFromOrderwise(
  baseUrl: string,
  token: string,
  environment: string,
  modifiedSince?: string
): Promise<OrderwiseCustomer[]> {
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  let url = `${baseUrl}${apiPath}/Customers`;

  if (modifiedSince) {
    url += `?lastAmendedDateTime=${encodeURIComponent(modifiedSince)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch customers: ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Invalid response format from Orderwise API');
  }

  return data.map((item: any) => {
    const rawId = item.id ?? item.Id ?? item.customerId ?? item.CustomerId;
    return {
      id: rawId != null ? Number(rawId) : undefined,
      accountNumber: String(item.accountNumber || item.AccountNumber || ''),
      name: item.statementName || item.name || item.Name || '',
      email: item.statementEmail || item.email || item.Email || undefined,
      phone: item.statementTelephone || item.phone || item.Phone || undefined,
      company: item.companyName || item.company || item.Company || undefined,
      shippingName: item.statementName || item.shippingName || undefined,
      shippingAddress1: item.statementAddress1 || item.shippingAddress1 || undefined,
      shippingAddress2: item.statementAddress2 || item.shippingAddress2 || undefined,
      shippingAddress3: item.statementAddress3 || item.shippingAddress3 || undefined,
      shippingTown: item.statementTown || item.shippingTown || undefined,
      shippingCounty: item.statementCounty || item.shippingCounty || undefined,
      shippingPostcode: item.statementPostcode || item.shippingPostcode || undefined,
      shippingCountry: item.statementCountry || item.shippingCountry || undefined,
      shippingCountryCode: item.statementCountryCode || item.shippingCountryCode || undefined,
      shippingEmail: item.statementEmail || item.shippingEmail || undefined,
      shippingTelephone: item.statementTelephone || item.shippingTelephone || undefined,
      metadata: item,
    };
  }).filter((c: OrderwiseCustomer) => c.accountNumber);
}

async function fetchDeliveryAddressesFromOrderwise(
  baseUrl: string,
  token: string,
  environment: string,
  orderwiseId: number
): Promise<{ addresses: OrderwiseDeliveryAddress[]; error?: string }> {
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  const url = `${baseUrl}${apiPath}/customers/${orderwiseId}/delivery-addresses`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return { addresses: [], error: `HTTP ${response.status}: ${text.substring(0, 200)}` };
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return { addresses: [], error: `Unexpected response format: ${JSON.stringify(data).substring(0, 200)}` };
    }

    const addresses = data.map((item: any) => ({
      id: item.id ?? item.Id ?? item.addressId ?? item.deliveryAddressId ?? item.DeliveryAddressId,
      name: item.name || item.Name || item.deliveryName || undefined,
      contactName: item.contactName || item.ContactName || item.contact || undefined,
      address1: item.address1 || item.Address1 || item.deliveryAddress1 || undefined,
      address2: item.address2 || item.Address2 || item.deliveryAddress2 || undefined,
      address3: item.address3 || item.Address3 || item.deliveryAddress3 || undefined,
      town: item.town || item.Town || item.deliveryTown || undefined,
      county: item.county || item.County || item.deliveryCounty || undefined,
      postcode: item.postcode || item.Postcode || item.deliveryPostcode || undefined,
      country: item.country || item.Country || item.deliveryCountry || undefined,
      countryCode: item.countryCode || item.CountryCode || item.deliveryCountryCode || undefined,
      telephone: item.telephone || item.Telephone || item.deliveryTelephone || undefined,
      email: item.email || item.Email || item.deliveryEmail || undefined,
      isDefault: item.isDefault === true || item.IsDefault === true || item.default === true,
      metadata: item,
    })).filter((a: OrderwiseDeliveryAddress) => a.id != null);

    return { addresses };
  } catch (err) {
    return { addresses: [], error: err instanceof Error ? err.message : 'Unknown fetch error' };
  }
}

async function syncCustomerDeliveryAddresses(
  supabase: any,
  customerId: string,
  orderwiseId: number,
  erpDestinationId: string,
  addresses: OrderwiseDeliveryAddress[],
  customerSyncLogId: string
): Promise<AddressSyncStats> {
  const stats: AddressSyncStats = { fetched: addresses.length, created: 0, updated: 0, skipped: 0 };

  if (addresses.length === 0) {
    return stats;
  }

  const { data: syncLog } = await supabase
    .from('delivery_address_sync_log')
    .insert({
      customer_id: customerId,
      erp_destination_id: erpDestinationId,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const syncLogId = syncLog?.id;

  const syncItems: Array<{
    sync_log_id: string;
    delivery_address_id?: string;
    external_id: string;
    action: 'created' | 'updated' | 'skipped';
    address_snapshot: Record<string, any>;
    error_message?: string;
  }> = [];

  for (const addr of addresses) {
    if (addr.id == null) {
      stats.skipped++;
      if (syncLogId) {
        syncItems.push({
          sync_log_id: syncLogId,
          external_id: 'unknown',
          action: 'skipped',
          address_snapshot: addr.metadata || {},
          error_message: 'Missing address ID',
        });
      }
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

      const addressSnapshot = { external_id: externalId, ...fields };

      if (existing) {
        const { error: updateError } = await supabase
          .from('customer_delivery_addresses')
          .update(fields)
          .eq('id', existing.id);

        if (updateError) {
          stats.skipped++;
          if (syncLogId) {
            syncItems.push({
              sync_log_id: syncLogId,
              delivery_address_id: existing.id,
              external_id: externalId,
              action: 'skipped',
              address_snapshot: addressSnapshot,
              error_message: updateError.message,
            });
          }
        } else {
          stats.updated++;
          if (syncLogId) {
            syncItems.push({
              sync_log_id: syncLogId,
              delivery_address_id: existing.id,
              external_id: externalId,
              action: 'updated',
              address_snapshot: addressSnapshot,
            });
          }
        }
      } else {
        const { data: insertedAddr, error: insertError } = await supabase
          .from('customer_delivery_addresses')
          .insert({
            customer_id: customerId,
            external_id: externalId,
            ...fields,
          })
          .select('id')
          .single();

        if (insertError) {
          stats.skipped++;
          if (syncLogId) {
            syncItems.push({
              sync_log_id: syncLogId,
              external_id: externalId,
              action: 'skipped',
              address_snapshot: addressSnapshot,
              error_message: insertError.message,
            });
          }
        } else {
          stats.created++;
          if (syncLogId) {
            syncItems.push({
              sync_log_id: syncLogId,
              delivery_address_id: insertedAddr?.id,
              external_id: externalId,
              action: 'created',
              address_snapshot: addressSnapshot,
            });
          }
        }
      }
    } catch (itemErr) {
      stats.skipped++;
      if (syncLogId) {
        syncItems.push({
          sync_log_id: syncLogId,
          external_id: externalId,
          action: 'skipped',
          address_snapshot: addr.metadata || {},
          error_message: itemErr instanceof Error ? itemErr.message : 'Unknown error',
        });
      }
    }
  }

  if (syncLogId) {
    if (syncItems.length > 0) {
      await supabase.from('delivery_address_sync_items').insert(syncItems);
    }

    await supabase
      .from('delivery_address_sync_log')
      .update({
        status: 'completed',
        addresses_fetched: stats.fetched,
        addresses_created: stats.created,
        addresses_updated: stats.updated,
        addresses_skipped: stats.skipped,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);
  }

  return stats;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: destinations, error: destError } = await supabase
      .from('erp_destinations')
      .select('id, slug, enabled')
      .eq('slug', 'orderwise')
      .eq('enabled', true);

    if (destError) throw destError;
    if (!destinations || destinations.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No enabled Orderwise destinations found' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const results = [];

    for (const destination of destinations) {
      const { data: config, error: configError } = await supabase
        .from('erp_configurations')
        .select('*')
        .eq('erp_destination_id', destination.id)
        .maybeSingle();

      if (configError || !config) {
        results.push({
          destination: destination.slug,
          status: 'skipped',
          reason: 'No configuration found',
        });
        continue;
      }

      const credentials = config.credentials;
      if (!credentials?.base_url || !credentials?.username || !credentials?.password) {
        results.push({
          destination: destination.slug,
          status: 'skipped',
          reason: 'Missing credentials',
        });
        continue;
      }

      const { data: lastSync } = await supabase
        .from('customer_sync_log')
        .select('completed_at')
        .eq('erp_destination_id', destination.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const modifiedSince = lastSync?.completed_at || undefined;

      const { data: syncLog, error: syncLogError } = await supabase
        .from('customer_sync_log')
        .insert({
          erp_destination_id: destination.id,
          sync_type: 'scheduled',
          status: 'running',
          started_at: new Date().toISOString(),
          last_modified_since: modifiedSince || null,
        })
        .select()
        .single();

      if (syncLogError || !syncLog) {
        results.push({
          destination: destination.slug,
          status: 'failed',
          reason: 'Failed to create sync log',
        });
        continue;
      }

      try {
        const token = await authenticateOrderwise(
          credentials.base_url,
          credentials.username,
          credentials.password,
          credentials.environment || 'sandbox'
        );

        const customers = await fetchCustomersFromOrderwise(
          credentials.base_url,
          token,
          credentials.environment || 'sandbox',
          modifiedSince
        );

        let created = 0;
        let updated = 0;
        let skipped = 0;

        const addressStats: AddressSyncStats = { fetched: 0, created: 0, updated: 0, skipped: 0 };
        const environment = credentials.environment || 'sandbox';

        for (const customer of customers) {
          if (!customer.accountNumber || !customer.name) {
            skipped++;
            continue;
          }

          try {
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, metadata, orderwise_id')
              .eq('external_id', customer.accountNumber)
              .maybeSingle();

            if (existingCustomer) {
              const orderwiseIdToUse = customer.id ?? existingCustomer.orderwise_id;

              const { error: updateError } = await supabase
                .from('customers')
                .update({
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  company: customer.company,
                  account_number: customer.accountNumber,
                  orderwise_id: orderwiseIdToUse,
                  shipping_name: customer.shippingName,
                  shipping_address1: customer.shippingAddress1,
                  shipping_address2: customer.shippingAddress2,
                  shipping_address3: customer.shippingAddress3,
                  shipping_town: customer.shippingTown,
                  shipping_county: customer.shippingCounty,
                  shipping_postcode: customer.shippingPostcode,
                  shipping_country: customer.shippingCountry,
                  shipping_country_code: customer.shippingCountryCode,
                  shipping_email: customer.shippingEmail,
                  shipping_telephone: customer.shippingTelephone,
                  metadata: {
                    ...(existingCustomer.metadata || {}),
                    orderwise: customer.metadata,
                    last_synced_from_orderwise: new Date().toISOString(),
                  },
                })
                .eq('id', existingCustomer.id);

              if (updateError) {
                skipped++;
              } else {
                updated++;

                if (orderwiseIdToUse != null) {
                  const { addresses: deliveryAddresses, error: addrFetchError } = await fetchDeliveryAddressesFromOrderwise(
                    credentials.base_url,
                    token,
                    environment,
                    orderwiseIdToUse
                  );
                  if (addrFetchError) {
                    addressStats.skipped++;
                  } else {
                    const addrResult = await syncCustomerDeliveryAddresses(
                      supabase,
                      existingCustomer.id,
                      orderwiseIdToUse,
                      destination.id,
                      deliveryAddresses,
                      syncLog.id
                    );
                    addressStats.fetched += addrResult.fetched;
                    addressStats.created += addrResult.created;
                    addressStats.updated += addrResult.updated;
                    addressStats.skipped += addrResult.skipped;
                  }
                }
              }
            } else {
              const { data: insertedCustomer, error: insertError } = await supabase
                .from('customers')
                .insert({
                  external_id: customer.accountNumber,
                  account_number: customer.accountNumber,
                  orderwise_id: customer.id,
                  source_channel_id: destination.id,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  company: customer.company,
                  shipping_name: customer.shippingName,
                  shipping_address1: customer.shippingAddress1,
                  shipping_address2: customer.shippingAddress2,
                  shipping_address3: customer.shippingAddress3,
                  shipping_town: customer.shippingTown,
                  shipping_county: customer.shippingCounty,
                  shipping_postcode: customer.shippingPostcode,
                  shipping_country: customer.shippingCountry,
                  shipping_country_code: customer.shippingCountryCode,
                  shipping_email: customer.shippingEmail,
                  shipping_telephone: customer.shippingTelephone,
                  metadata: {
                    orderwise: customer.metadata,
                    last_synced_from_orderwise: new Date().toISOString(),
                  },
                })
                .select('id')
                .single();

              if (insertError) {
                skipped++;
              } else {
                created++;

                if (insertedCustomer && customer.id != null) {
                  const { addresses: deliveryAddresses, error: addrFetchError } = await fetchDeliveryAddressesFromOrderwise(
                    credentials.base_url,
                    token,
                    environment,
                    customer.id
                  );
                  if (addrFetchError) {
                    addressStats.skipped++;
                  } else {
                    const addrResult = await syncCustomerDeliveryAddresses(
                      supabase,
                      insertedCustomer.id,
                      customer.id,
                      destination.id,
                      deliveryAddresses,
                      syncLog.id
                    );
                    addressStats.fetched += addrResult.fetched;
                    addressStats.created += addrResult.created;
                    addressStats.updated += addrResult.updated;
                    addressStats.skipped += addrResult.skipped;
                  }
                }
              }
            }
          } catch (err) {
            skipped++;
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
            addresses_fetched: addressStats.fetched,
            addresses_created: addressStats.created,
            addresses_updated: addressStats.updated,
            addresses_skipped: addressStats.skipped,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLog.id);

        results.push({
          destination: destination.slug,
          status: 'completed',
          stats: {
            customers: {
              fetched: customers.length,
              created,
              updated,
              skipped,
            },
            addresses: addressStats,
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

        await supabase
          .from('customer_sync_log')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: { error: String(err) },
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLog.id);

        results.push({
          destination: destination.slug,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
