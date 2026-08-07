// @ts-nocheck -- Supabase edge functions run on Deno, not the app's TS build.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_ROLES = ["manager", "dispatcher", "technician"];

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

    const { email, role } = await req.json();

    if (!email || typeof email !== "string" || email.trim() === "") {
      return jsonResponse({ error: "Email is required" }, 400);
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return jsonResponse({ error: "Invalid role" }, 400);
    }

    // Determine the caller's company + confirm they are an owner
    const { data: membership, error: memError } = await supabase
      .from("company_memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memError) throw memError;
    if (!membership) {
      return jsonResponse({ error: "You do not belong to a company" }, 400);
    }
    if (membership.role !== "owner") {
      return jsonResponse({ error: "Only company owners can send invitations" }, 403);
    }

    // Load the company name for the email
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", membership.company_id)
      .maybeSingle();

    const companyName = company?.name ?? "your company";

    // Reject duplicate pending invitations for the same email in this company
    const { data: existing } = await supabase
      .from("invitations")
      .select("id, invite_code")
      .eq("company_id", membership.company_id)
      .eq("email", email.trim())
      .is("accepted_by", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return jsonResponse(
        { error: "An active invitation already exists for this email", invite_code: existing.invite_code },
        409,
      );
    }

    // Generate a unique 6-digit code (retry on collision)
    let inviteCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000));
      const { data: collision } = await supabase
        .from("invitations")
        .select("id")
        .eq("invite_code", inviteCode)
        .maybeSingle();
      if (!collision) break;
    }
    if (!inviteCode) {
      return jsonResponse({ error: "Could not generate a unique invite code" }, 500);
    }

    // Create the invitation row (7-day expiry)
    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        company_id: membership.company_id,
        email: email.trim(),
        role,
        invite_code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    // Send the invite code by email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

    let emailError: string | null = null;
    if (resendKey) {
      const appUrl = Deno.env.get("APP_URL") ?? "https://biptach.vercel.app";
      const signupUrl = `${appUrl}/signup`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email.trim()],
          subject: `You've been invited to join ${companyName} on Biptach`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="margin: 0 0 16px; color: #111827;">You're invited to ${companyName}</h2>
              <p style="color: #374151; font-size: 15px; line-height: 1.5;">
                You've been invited to join <strong>${companyName}</strong> on Biptach as a
                <strong>${role}</strong>.
              </p>
              <p style="color: #374151; font-size: 15px; line-height: 1.5;">Your invite code is:</p>
              <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; margin: 12px 0;">
                ${inviteCode}
              </p>
              <p style="color: #374151; font-size: 15px; line-height: 1.5;">
                Go to <a href="${signupUrl}" style="color: #2563eb;">${signupUrl}</a>,
                choose <strong>Join Company</strong>, and enter this code. It expires in <strong>7 days</strong>.
              </p>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
                If you didn't expect this invitation, you can ignore this email.
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        emailError = `Email failed to send (${res.status}): ${body}`;
        console.error("[send-invitation] Resend error:", emailError);
      }
    } else {
      emailError = "RESEND_API_KEY is not configured; invitation created but email not sent";
      console.warn("[send-invitation] RESEND_API_KEY missing");
    }

    return jsonResponse(
      {
        invitation,
        email_sent: !emailError,
        email_error: emailError,
      },
      200,
    );
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
