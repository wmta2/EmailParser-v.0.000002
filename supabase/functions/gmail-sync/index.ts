import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<{ mimeType: string; body?: { data?: string } }>;
    }>;
  };
  internalDate: string;
}

interface ImportRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  match_field: string;
  match_type: string;
  match_value: string;
  action: string;
  template_id: string | null;
}

function decodeBase64(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

function extractBody(payload: GmailMessageDetail["payload"]): { text: string; html: string } {
  let text = "";
  let html = "";

  function processParts(parts: typeof payload.parts) {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = decodeBase64(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = decodeBase64(part.body.data);
      } else if (part.parts) {
        processParts(part.parts);
      }
    }
  }

  if (payload.body?.data) {
    text = decodeBase64(payload.body.data);
  }
  processParts(payload.parts);

  return { text, html };
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function matchesRule(rule: ImportRule, subject: string, from: string, bodyText: string): boolean {
  const fieldValue = rule.match_field === "sender"
    ? from
    : rule.match_field === "subject"
    ? subject
    : bodyText;

  const value = fieldValue.toLowerCase();
  const match = rule.match_value.toLowerCase();

  switch (rule.match_type) {
    case "contains":
      return value.includes(match);
    case "exact":
      return value === match;
    case "starts_with":
      return value.startsWith(match);
    case "regex":
      try {
        return new RegExp(rule.match_value, "i").test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  connection: { id: string; access_token: string; refresh_token: string; token_expires_at: string },
  clientId: string,
  clientSecret: string
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() < expiresAt - bufferMs) {
    return connection.access_token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    throw new Error(tokens.error_description || "Failed to refresh access token");
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("gmail_connection")
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "Missing required configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { sync_type?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const syncType = body.sync_type || "manual";

  const { data: logData } = await supabase
    .from("gmail_sync_log")
    .insert({ sync_type: syncType, status: "running" })
    .select("id")
    .single();

  const logId = logData?.id;

  let emailsFound = 0;
  let emailsImported = 0;
  let emailsSkipped = 0;
  let emailsFailed = 0;
  const errors: string[] = [];

  try {
    const { data: connection } = await supabase
      .from("gmail_connection")
      .select("id, access_token, refresh_token, token_expires_at, last_synced_at")
      .eq("connection_status", "connected")
      .maybeSingle();

    if (!connection) {
      throw new Error("No connected Gmail account found");
    }

    const { data: settings } = await supabase
      .from("gmail_settings")
      .select("max_emails_per_sync, sync_start_from")
      .maybeSingle();

    const maxEmailsPerSync = settings?.max_emails_per_sync ?? 10;
    const syncStartFrom = settings?.sync_start_from ?? null;

    const accessToken = await getValidAccessToken(supabase, connection, clientId, clientSecret);

    const { data: rules } = await supabase
      .from("gmail_import_rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true });

    const activeRules: ImportRule[] = rules || [];

    let afterTimestamp: number;

    if (connection.last_synced_at) {
      afterTimestamp = Math.floor(new Date(connection.last_synced_at).getTime() / 1000);
    } else if (syncStartFrom) {
      afterTimestamp = Math.floor(new Date(syncStartFrom).getTime() / 1000);
    } else {
      afterTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    }

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${afterTimestamp}&maxResults=${maxEmailsPerSync}`;
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData = await listResponse.json();

    if (!listResponse.ok) {
      throw new Error(listData.error?.message || "Failed to list Gmail messages");
    }

    const messages: GmailMessage[] = listData.messages || [];
    emailsFound = messages.length;

    for (const msg of messages) {
      try {
        const { data: existingEmail } = await supabase
          .from("raw_email")
          .select("id")
          .eq("gmail_message_id", msg.id)
          .maybeSingle();

        if (existingEmail) {
          emailsSkipped++;
          continue;
        }

        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const detail: GmailMessageDetail = await detailResponse.json();

        if (!detailResponse.ok) {
          emailsFailed++;
          errors.push(`Failed to fetch message ${msg.id}`);
          continue;
        }

        const headers = detail.payload.headers;
        const subject = getHeader(headers, "Subject");
        const from = getHeader(headers, "From");
        const dateStr = getHeader(headers, "Date");
        const messageId = getHeader(headers, "Message-ID");
        const { text, html } = extractBody(detail.payload);

        let matchedRule: ImportRule | null = null;
        for (const rule of activeRules) {
          if (matchesRule(rule, subject, from, text)) {
            matchedRule = rule;
            break;
          }
        }

        if (matchedRule && matchedRule.action === "skip") {
          emailsSkipped++;
          continue;
        }

        if (activeRules.length > 0 && !matchedRule) {
          emailsSkipped++;
          continue;
        }

        const dateReceived = dateStr
          ? new Date(dateStr).toISOString()
          : new Date(parseInt(detail.internalDate)).toISOString();

        const { error: insertError } = await supabase.from("raw_email").insert({
          subject,
          from_email: from,
          content: text,
          html_body: html,
          gmail_message_id: msg.id,
          message_id: messageId || null,
          date_received: dateReceived,
          date_parsed: new Date().toISOString(),
          platform: "gmail",
        });

        if (insertError) {
          emailsFailed++;
          errors.push(`Failed to import message ${msg.id}: ${insertError.message}`);
          continue;
        }

        emailsImported++;
      } catch (msgErr) {
        emailsFailed++;
        errors.push(`Error processing message ${msg.id}: ${msgErr instanceof Error ? msgErr.message : String(msgErr)}`);
      }
    }

    await supabase
      .from("gmail_connection")
      .update({
        last_synced_at: new Date().toISOString(),
        connection_status: "connected",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    const status = emailsFailed > 0 && emailsImported === 0
      ? "failed"
      : emailsFailed > 0
      ? "partial"
      : "success";

    if (logId) {
      await supabase
        .from("gmail_sync_log")
        .update({
          status,
          emails_found: emailsFound,
          emails_imported: emailsImported,
          emails_skipped: emailsSkipped,
          emails_failed: emailsFailed,
          error_details: errors.length > 0 ? { errors } : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, emails_found: emailsFound, emails_imported: emailsImported, emails_skipped: emailsSkipped, emails_failed: emailsFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    if (logId) {
      await supabase
        .from("gmail_sync_log")
        .update({
          status: "failed",
          emails_found: emailsFound,
          emails_imported: emailsImported,
          emails_skipped: emailsSkipped,
          emails_failed: emailsFailed,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    const { data: connection } = await supabase
      .from("gmail_connection")
      .select("id")
      .maybeSingle();

    if (connection) {
      await supabase
        .from("gmail_connection")
        .update({
          connection_status: "error",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
