// @ts-nocheck -- Supabase edge functions run on Deno, not the app's TS build.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

    const body = await req.json();
    const { action, to_user_id, code } = body;

    if (!action || !["send-code", "confirm"].includes(action)) {
      return jsonResponse({ error: "Invalid action" }, 400);
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
      return jsonResponse({ error: "Only company owners can transfer ownership" }, 403);
    }

    const companyId = membership.company_id;

    if (action === "send-code") {
      return await handleSendCode(supabase, user, companyId, to_user_id);
    }

    return await handleConfirm(supabase, user, companyId, to_user_id, code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});

async function handleSendCode(supabase, owner, companyId, toUserId) {
  if (!toUserId || typeof toUserId !== "string" || toUserId.trim() === "") {
    return jsonResponse({ error: "Target member is required" }, 400);
  }
  if (toUserId === owner.id) {
    return jsonResponse({ error: "You cannot transfer ownership to yourself" }, 400);
  }

  // Load the target member and confirm they belong to the same company
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, name, role, is_active, company_id")
    .eq("id", toUserId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetProfile) {
    return jsonResponse({ error: "Target member not found" }, 404);
  }
  if (targetProfile.company_id !== companyId) {
    return jsonResponse({ error: "Target member does not belong to your company" }, 400);
  }
  if (!targetProfile.is_active) {
    return jsonResponse({ error: "Cannot transfer ownership to an inactive member" }, 400);
  }

  // Invalidate any previous unused, unexpired transfer codes for this company
  await supabase
    .from("ownership_transfers")
    .update({ used_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .is("used_at", null)
    .gte("expires_at", new Date().toISOString());

  // Generate a unique 6-digit code
  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const { data: collision } = await supabase
      .from("ownership_transfers")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!collision) break;
  }
  if (!code) {
    return jsonResponse({ error: "Could not generate a unique verification code" }, 500);
  }

  const { error: insertError } = await supabase.from("ownership_transfers").insert({
    company_id: companyId,
    from_user_id: owner.id,
    to_user_id: toUserId,
    code,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (insertError) throw insertError;

  // Send the verification code to the OWNER's email via Resend
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

  let emailError: string | null = null;
  if (resendKey) {
    const ownerEmail = owner.email;
    if (!ownerEmail) {
      emailError = "Owner has no email address on file; code not sent";
    } else {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [ownerEmail],
          subject: "Confirm ownership transfer on Biptach",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="margin: 0 0 16px; color: #111827;">Confirm ownership transfer</h2>
              <p style="color: #374151; font-size: 15px; line-height: 1.5;">
                You requested to transfer ownership of your company to
                <strong>${targetProfile.name}</strong>. To confirm, enter this code:
              </p>
              <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; margin: 12px 0;">
                ${code}
              </p>
              <p style="color: #374151; font-size: 15px; line-height: 1.5;">
                This code expires in <strong>10 minutes</strong>. After confirming, you will become a
                <strong>manager</strong> and ${targetProfile.name} will become the new owner.
              </p>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
                If you didn't request this transfer, you can ignore this email.
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        emailError = `Email failed to send (${res.status}): ${body}`;
        console.error("[transfer-ownership] Resend error:", emailError);
      }
    }
  } else {
    emailError = "RESEND_API_KEY is not configured; code created but email not sent";
    console.warn("[transfer-ownership] RESEND_API_KEY missing");
  }

  return jsonResponse(
    {
      sent: !emailError,
      email_error: emailError,
      message: emailError
        ? "Verification code created but could not be emailed. Check your email configuration."
        : `Verification code sent to ${owner.email}. It expires in 10 minutes.`,
    },
    200,
  );
}

async function handleConfirm(supabase, owner, companyId, toUserId, code) {
  if (!toUserId || typeof toUserId !== "string" || toUserId.trim() === "") {
    return jsonResponse({ error: "Target member is required" }, 400);
  }
  if (!code || typeof code !== "string" || code.trim() === "") {
    return jsonResponse({ error: "Verification code is required" }, 400);
  }

  // Load the active transfer record for this company + target
  const { data: transfer, error: transferError } = await supabase
    .from("ownership_transfers")
    .select("*")
    .eq("company_id", companyId)
    .eq("to_user_id", toUserId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (transferError) throw transferError;
  if (!transfer) {
    return jsonResponse({ error: "No pending ownership transfer found. Request a new code." }, 400);
  }
  if (transfer.code !== code.trim()) {
    return jsonResponse({ error: "Incorrect verification code" }, 400);
  }
  if (new Date(transfer.expires_at) < new Date()) {
    return jsonResponse({ error: "Verification code has expired. Request a new one." }, 400);
  }

  // Confirm the target still belongs to the same company and is active
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, company_id, is_active")
    .eq("id", toUserId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetProfile || targetProfile.company_id !== companyId) {
    return jsonResponse({ error: "Target member no longer belongs to your company" }, 400);
  }
  if (!targetProfile.is_active) {
    return jsonResponse({ error: "Cannot transfer ownership to an inactive member" }, 400);
  }

  // Perform the role swap: target -> owner, old owner -> manager
  // Update profiles table
  const { error: targetProfileError } = await supabase
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", toUserId);
  if (targetProfileError) throw targetProfileError;

  const { error: ownerProfileError } = await supabase
    .from("profiles")
    .update({ role: "manager" })
    .eq("id", owner.id);
  if (ownerProfileError) throw ownerProfileError;

  // Update company_memberships table (keeps authorization in sync)
  const { error: targetMemError } = await supabase
    .from("company_memberships")
    .update({ role: "owner" })
    .eq("user_id", toUserId)
    .eq("company_id", companyId);
  if (targetMemError) throw targetMemError;

  const { error: ownerMemError } = await supabase
    .from("company_memberships")
    .update({ role: "manager" })
    .eq("user_id", owner.id)
    .eq("company_id", companyId);
  if (ownerMemError) throw ownerMemError;

  // Mark the transfer record as used
  const { error: usedError } = await supabase
    .from("ownership_transfers")
    .update({ used_at: new Date().toISOString() })
    .eq("id", transfer.id);
  if (usedError) throw usedError;

  return jsonResponse(
    {
      success: true,
      message: `Ownership transferred to ${targetProfile.id}. You are now a manager.`,
    },
    200,
  );
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
