import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret || !redirectUri || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing required configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Authorization code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: tokens.error_description || "Failed to exchange code for tokens" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { data: existing } = await supabase
      .from("gmail_connection")
      .select("id")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("gmail_connection")
        .update({
          gmail_address: userInfo.email || "",
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
        gmail_address: userInfo.email || "",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || "",
        token_expires_at: expiresAt,
        connection_status: "connected",
        error_message: null,
      });
    }

    return new Response(
      JSON.stringify({ success: true, gmail_address: userInfo.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
