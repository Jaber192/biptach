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

    const { invite_code } = await req.json();
    if (!invite_code || typeof invite_code !== "string" || invite_code.trim() === "") {
      return jsonResponse({ error: "Invitation code is required" }, 400);
    }

    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*")
      .eq("invite_code", invite_code.trim())
      .maybeSingle();

    if (invError) throw invError;
    if (!invitation) {
      return jsonResponse({ error: "Invalid invitation code" }, 400);
    }

    if (invitation.accepted_by) {
      return jsonResponse({ error: "Invitation already accepted" }, 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return jsonResponse({ error: "Invitation has expired" }, 400);
    }

    const { data: existingMembership } = await supabase
      .from("company_memberships")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      return jsonResponse({ error: "User already belongs to a company" }, 400);
    }

    const { error: membershipError } = await supabase
      .from("company_memberships")
      .insert({ company_id: invitation.company_id, user_id: user.id, role: invitation.role });
    if (membershipError) throw membershipError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: invitation.role, company_id: invitation.company_id })
      .eq("id", user.id);
    if (profileError) throw profileError;

    const { error: updateInvError } = await supabase
      .from("invitations")
      .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);
    if (updateInvError) throw updateInvError;

    return jsonResponse({ company_id: invitation.company_id }, 200);
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
