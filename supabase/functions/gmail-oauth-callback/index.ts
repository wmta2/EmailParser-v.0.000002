import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error(tokens.error_description || "Failed to exchange code for tokens");
  }

  return tokens;
}

async function saveConnection(supabaseUrl: string, serviceRoleKey: string, tokens: Record<string, unknown>, email: string) {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const expiresAt = new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString();

  const { data: existing } = await supabase
    .from("gmail_connection")
    .select("id")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("gmail_connection")
      .update({
        gmail_address: email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || "",
        token_expires_at: expiresAt,
        connection_status: "connected",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("gmail_connection").insert({
      gmail_address: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      token_expires_at: expiresAt,
      connection_status: "connected",
      error_message: null,
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL") || "https://oprsyefsemobglecxboc.supabase.co";

  if (!clientId || !clientSecret || !redirectUri || !supabaseUrl || !serviceRoleKey) {
    if (req.method === "GET") {
      return Response.redirect(`${appUrl}?gmail=error&reason=config`, 302);
    }
    return new Response(
      JSON.stringify({ error: "Missing required configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error || !code) {
        return Response.redirect(`${appUrl}?gmail=error&reason=${error || "no_code"}`, 302);
      }

      const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();

      await saveConnection(supabaseUrl, serviceRoleKey, tokens, userInfo.email || "");

      return Response.redirect(`${appUrl}?gmail=connected`, 302);
    }

    if (req.method === "POST") {
      const { code } = await req.json();

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Authorization code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();

      await saveConnection(supabaseUrl, serviceRoleKey, tokens, userInfo.email || "");

      return new Response(
        JSON.stringify({ success: true, gmail_address: userInfo.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (req.method === "GET") {
      return Response.redirect(`${appUrl}?gmail=error&reason=server_error`, 302);
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
