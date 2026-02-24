import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProxyRequest {
  action: "test-auth" | "api-request";
  credentials: {
    base_url: string;
    username: string;
    password: string;
  };
  environment?: "live" | "sandbox";
  method?: string;
  path?: string;
  body?: Record<string, unknown>;
  queryParams?: Record<string, string>;
  erpDestinationId?: string;
  erpConfigurationId?: string;
}

interface ApiLogData {
  erp_destination_id?: string;
  erp_configuration_id?: string;
  request_type: "authentication" | "api_request";
  endpoint: string;
  http_method: string;
  request_headers: Record<string, unknown>;
  request_body?: Record<string, unknown>;
  response_status?: number;
  response_headers?: Record<string, unknown>;
  response_body?: unknown;
  error_message?: string;
  duration_ms: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

function getSupabaseClient(authHeader?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = authHeader?.replace("Bearer ", "") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, unknown> {
  const sanitized = { ...headers };
  if (sanitized.Authorization) {
    if (sanitized.Authorization.startsWith("Basic ")) {
      sanitized.Authorization = "Basic [REDACTED]";
    } else if (sanitized.Authorization.startsWith("Bearer ")) {
      const token = sanitized.Authorization.replace("Bearer ", "");
      sanitized.Authorization = `Bearer ...${token.slice(-4)}`;
    }
  }
  return sanitized;
}

function sanitizeCredentials(username: string, password: string) {
  return {
    username: username.length > 4 ? `${username.slice(0, 4)}****` : "****",
    password: "****",
  };
}

async function saveApiLog(
  supabase: ReturnType<typeof createClient>,
  logData: ApiLogData
) {
  try {
    // Use service role client for logging to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await serviceClient.from("erp_api_logs").insert(logData);

    if (error) {
      console.error("[API Log] Failed to save log to database:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log("[API Log] Successfully saved to database:", {
        request_type: logData.request_type,
        endpoint: logData.endpoint,
        success: logData.success,
        status: logData.response_status,
      });
    }
  } catch (error) {
    console.error("[API Log] Exception while saving log:", error);
  }
}

function constructApiUrl(baseDomain: string, environment: "live" | "sandbox" = "sandbox"): string {
  // Clean the base domain of any path components
  let domain = baseDomain.replace(/\/+$/, "");

  // Remove any existing /OWAPI or /OWAPISB paths
  domain = domain.replace(/\/(OWAPI|OWAPISB)$/i, "");

  // Construct the full URL based on environment
  const apiPath = environment === "live" ? "/OWAPI" : "/OWAPISB";
  return `${domain}${apiPath}`;
}

function getErrorMessage(status: number, responseBody: unknown, environment?: string): string {
  if (status === 401) {
    const bodyStr = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
    if (!bodyStr || bodyStr.trim() === "" || bodyStr === '""') {
      return "Authentication failed. Verify your username and password are correct API credentials (not regular login credentials). Ensure API access is enabled for this user in Orderwise.";
    }
    return "Authentication failed. Check your credentials.";
  }
  if (status === 403) {
    return `Access forbidden. Check that your API user group has the required permissions in Orderwise for this operation.`;
  }
  if (status === 404) {
    const envHint = environment ? ` (currently using ${environment} environment)` : "";
    return `Endpoint not found${envHint}. Verify your base URL is correct and the resource exists.`;
  }
  if (status >= 500) {
    return "Orderwise API server error. The service may be temporarily unavailable.";
  }
  return `Request failed with status ${status}`;
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getToken(
  baseUrl: string,
  username: string,
  password: string,
  supabase: ReturnType<typeof createClient>,
  environment: "live" | "sandbox" = "sandbox",
  erpDestinationId?: string,
  erpConfigurationId?: string
): Promise<string> {
  const encoded = btoa(`${username}:${password}`);
  const fullApiUrl = constructApiUrl(baseUrl, environment);
  const url = `${fullApiUrl}/token/gettoken`;
  const startTime = Date.now();

  const requestHeaders = { Authorization: `Basic ${encoded}` };

  // Log the request details for debugging
  console.log('[Orderwise Auth] Attempting authentication:', {
    url,
    environment,
    timestamp: new Date().toISOString(),
    usernameLength: username.length,
    baseUrlEnding: baseUrl.slice(-20),
    erpDestinationId: erpDestinationId || 'not provided',
    erpConfigurationId: erpConfigurationId || 'not provided',
  });

  let response: Response | null = null;
  let responseBody: unknown = null;
  let success = false;
  let errorMessage: string | undefined;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: requestHeaders,
    });

    const text = await response.text();
    responseBody = text;

    console.log('[Orderwise Auth] Response received:', {
      status: response.status,
      statusText: response.statusText,
      bodyLength: text.length,
      bodyPreview: text.substring(0, 100),
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      errorMessage = getErrorMessage(response.status, text, environment);
      throw new Error(`Authentication failed (${response.status}): ${text}`);
    }

    success = true;
    const token = text.replace(/^"|"$/g, "");

    // Capture response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    await saveApiLog(supabase, {
      erp_destination_id: erpDestinationId,
      erp_configuration_id: erpConfigurationId,
      request_type: "authentication",
      endpoint: url,
      http_method: "GET",
      request_headers: sanitizeHeaders({ Authorization: `Basic ${encoded}` }),
      response_status: response.status,
      response_headers: responseHeaders,
      response_body: "Token retrieved successfully",
      duration_ms: Date.now() - startTime,
      success: true,
      metadata: {
        environment,
        credentials: sanitizeCredentials(username, password),
        deno_version: Deno.version.deno,
      },
    });

    return token;
  } catch (error) {
    // Capture response headers even on error
    const responseHeaders: Record<string, string> = {};
    if (response) {
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
    }

    await saveApiLog(supabase, {
      erp_destination_id: erpDestinationId,
      erp_configuration_id: erpConfigurationId,
      request_type: "authentication",
      endpoint: url,
      http_method: "GET",
      request_headers: sanitizeHeaders({ Authorization: `Basic ${encoded}` }),
      response_status: response?.status,
      response_headers: Object.keys(responseHeaders).length > 0 ? responseHeaders : undefined,
      response_body: responseBody,
      error_message: errorMessage || (error instanceof Error ? error.message : "Authentication failed"),
      duration_ms: Date.now() - startTime,
      success: false,
      metadata: {
        environment,
        credentials: sanitizeCredentials(username, password),
        error_stack: error instanceof Error ? error.stack : undefined,
        deno_version: Deno.version.deno,
      },
    });
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || undefined;
  const supabase = getSupabaseClient(authHeader);

  try {
    const payload: ProxyRequest = await req.json();
    const { action, credentials, method, path, body: reqBody, queryParams, erpDestinationId, erpConfigurationId, environment = "sandbox" } =
      payload;

    if (
      !credentials?.base_url ||
      !credentials?.username ||
      !credentials?.password
    ) {
      return jsonResponse({ ok: false, error: "Missing credentials" }, 400);
    }

    const { base_url, username, password } = credentials;

    if (action === "test-auth") {
      await getToken(base_url, username, password, supabase, environment, erpDestinationId, erpConfigurationId);
      return jsonResponse({ ok: true, data: { authenticated: true } });
    }

    if (action === "api-request") {
      if (!path) {
        return jsonResponse(
          { ok: false, error: "Missing path for api-request" },
          400
        );
      }

      const token = await getToken(base_url, username, password, supabase, environment, erpDestinationId, erpConfigurationId);
      const fullApiUrl = constructApiUrl(base_url, environment);
      let url = `${fullApiUrl}${path}`;

      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
      }

      const startTime = Date.now();
      const httpMethod = method || "GET";
      const requestHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let apiResponse: Response | null = null;
      let responseData: unknown = null;
      let errorMessage: string | undefined;

      try {
        apiResponse = await fetch(url, {
          method: httpMethod,
          headers: requestHeaders,
          ...(reqBody ? { body: JSON.stringify(reqBody) } : {}),
        });

        const responseText = await apiResponse.text();
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        if (!apiResponse.ok) {
          errorMessage = getErrorMessage(apiResponse.status, responseData, environment);

          // Capture response headers
          const responseHeaders: Record<string, string> = {};
          apiResponse.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          await saveApiLog(supabase, {
            erp_destination_id: erpDestinationId,
            erp_configuration_id: erpConfigurationId,
            request_type: "api_request",
            endpoint: url,
            http_method: httpMethod,
            request_headers: sanitizeHeaders(requestHeaders),
            request_body: reqBody,
            response_status: apiResponse.status,
            response_headers: responseHeaders,
            response_body: responseData,
            error_message: errorMessage,
            duration_ms: Date.now() - startTime,
            success: false,
            metadata: {
              environment,
              path,
              query_params: queryParams,
              deno_version: Deno.version.deno,
            },
          });

          return jsonResponse({
            ok: false,
            status: apiResponse.status,
            error: errorMessage,
            details: typeof responseData === "string"
              ? responseData
              : JSON.stringify(responseData),
            responseBody: responseData,
            metadata: {
              httpMethod,
              endpoint: url,
              requestHeaders: sanitizeHeaders(requestHeaders),
              responseHeaders,
              durationMs: Date.now() - startTime,
            },
          });
        }

        // Capture response headers
        const responseHeaders: Record<string, string> = {};
        apiResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        await saveApiLog(supabase, {
          erp_destination_id: erpDestinationId,
          erp_configuration_id: erpConfigurationId,
          request_type: "api_request",
          endpoint: url,
          http_method: httpMethod,
          request_headers: sanitizeHeaders(requestHeaders),
          request_body: reqBody,
          response_status: apiResponse.status,
          response_headers: responseHeaders,
          response_body: responseData,
          duration_ms: Date.now() - startTime,
          success: true,
          metadata: {
            environment,
            path,
            query_params: queryParams,
            deno_version: Deno.version.deno,
          },
        });

        return jsonResponse({
          ok: true,
          status: apiResponse.status,
          data: responseData,
          metadata: {
            httpMethod,
            endpoint: url,
            requestHeaders: sanitizeHeaders(requestHeaders),
            responseHeaders,
            responseBody: responseData,
            durationMs: Date.now() - startTime,
          },
        });
      } catch (fetchError) {
        const duration = Date.now() - startTime;
        errorMessage = fetchError instanceof Error ? fetchError.message : "Network error occurred";

        if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
          errorMessage = "Request timed out after 30 seconds. The Orderwise API may be slow or unavailable.";
        } else if (errorMessage.includes("connection") || errorMessage.includes("network")) {
          errorMessage = "Cannot connect to Orderwise API. Check your base URL and network connectivity.";
        }

        await saveApiLog(supabase, {
          erp_destination_id: erpDestinationId,
          erp_configuration_id: erpConfigurationId,
          request_type: "api_request",
          endpoint: url,
          http_method: httpMethod,
          request_headers: sanitizeHeaders(requestHeaders),
          request_body: reqBody,
          response_status: apiResponse?.status,
          error_message: errorMessage,
          duration_ms: duration,
          success: false,
          metadata: {
            environment,
            path,
            query_params: queryParams,
            error_stack: fetchError instanceof Error ? fetchError.stack : undefined,
            deno_version: Deno.version.deno,
          },
        });

        return jsonResponse({
          ok: false,
          error: errorMessage,
          metadata: {
            httpMethod,
            endpoint: url,
            requestHeaders: sanitizeHeaders(requestHeaders),
            durationMs: duration,
          },
        }, 500);
      }
    }

    return jsonResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal error",
      },
      500
    );
  }
});
