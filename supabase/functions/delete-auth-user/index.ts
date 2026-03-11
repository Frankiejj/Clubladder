import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }

  const accessToken = authHeader.slice(7).trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userResult?.user?.id) {
    return jsonResponse({ error: "Invalid user session" }, 401);
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userResult.user.id);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ ok: true });
});
