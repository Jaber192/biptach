// @ts-nocheck -- Supabase edge functions run on Deno, not the app's TS build.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const { company_name } = await req.json();
    if (!company_name || typeof company_name !== "string" || company_name.trim() === "") {
      return jsonResponse({ error: "Company name is required" }, 400);
    }

    const { data: existingMembership } = await supabase
      .from("company_memberships")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      return jsonResponse({ error: "User already belongs to a company" }, 400);
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: company_name.trim(), created_by: user.id })
      .select("id")
      .single();

    if (companyError) throw companyError;

    const companyId = company.id;

    const { error: settingsError } = await supabase
      .from("company_settings")
      .insert({ company_id: companyId });
    if (settingsError) throw settingsError;

    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({ company_id: companyId, plan: "trial", seats: 5, status: "trialing" });
    if (subError) throw subError;

    const { error: membershipError } = await supabase
      .from("company_memberships")
      .insert({ company_id: companyId, user_id: user.id, role: "owner" });
    if (membershipError) throw membershipError;

    // Upsert the profile row so this works even if the auto-create trigger on
    // auth.users didn't fire (e.g. after the database was cleared/reset and the
    // profile row is missing). A plain UPDATE would silently affect 0 rows and
    // leave the user without a profile, causing an infinite loading loop.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          role: "owner",
          company_id: companyId,
          is_active: true,
        },
        { onConflict: "id" },
      );
    if (profileError) throw profileError;

    return jsonResponse({ company_id: companyId }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
