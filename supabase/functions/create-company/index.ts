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

    // Fast-fail pre-check (not atomic on its own — see the membership insert
    // below, which is the real guard against concurrent double-invokes).
    // NOTE: The deployed company_memberships table has no `id` column, so we
    // select `company_id` (which always exists) just to test for existence.
    const { data: existingMembership } = await supabase
      .from("company_memberships")
      .select("company_id")
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

    // IMPORTANT: Upsert the profile row BEFORE inserting the membership.
    // company_memberships.user_id has a FK -> profiles(id), so if the profile
    // row is missing (e.g. the auto-create trigger on auth.users didn't fire
    // after the database was cleared/reset), the membership insert would violate
    // the FK constraint and return a 500. Creating the profile row first
    // guarantees the FK is satisfied.
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

    // The membership insert is the ATOMIC guard against concurrent double-
    // invokes. company_memberships.user_id is UNIQUE, so if two invocations
    // race past the pre-check above, only ONE membership insert can succeed;
    // the other hits a unique-violation and we clean up its orphaned company.
    const { error: membershipError } = await supabase
      .from("company_memberships")
      .insert({ company_id: companyId, user_id: user.id, role: "owner" });

    if (membershipError) {
      // 23505 = unique_violation. This fires when a concurrent invocation already
      // inserted a membership for this user (the atomic guard). Any other error
      // (e.g. a check-constraint or FK failure) is a real problem and must throw.
      const isUniqueViolation =
        typeof membershipError.code === "string" && membershipError.code === "23505";

      if (isUniqueViolation) {
        // Another invocation already created a membership for this user. Roll
        // back the company we just created (cascades to settings/subscription)
        // and re-point the profile at the winning company, then report the
        // conflict cleanly instead of leaving duplicate rows behind.
        await supabase.from("companies").delete().eq("id", companyId);

        const { data: winner } = await supabase
          .from("company_memberships")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (winner?.company_id) {
          await supabase
            .from("profiles")
            .update({ company_id: winner.company_id, role: "owner" })
            .eq("id", user.id);
        }

        return jsonResponse({ error: "User already belongs to a company" }, 400);
      }

      throw membershipError;
    }

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
