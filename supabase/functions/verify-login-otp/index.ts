import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hashOTP(otp: string) {
  const data = new TextEncoder().encode(otp);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const token = authHeader.replace(
      "Bearer ",
      ""
    );

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (!["staff", "admin"].includes(profile?.role)) {
      return new Response(
        JSON.stringify({ error: "Email verification is only available for staff and admin accounts." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { otp } = await req.json();

    if (!otp || !/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({
          error:
            "Please enter a valid 6-digit verification code.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: otpRecord, error: otpError } =
      await supabaseAdmin
        .from("login_otps")
        .select("*")
        .eq("user_id", user.id)
        .eq("verified", false)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (otpError) {
      throw otpError;
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({
          error:
            "No active verification code found. Please request a new code.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      new Date(otpRecord.expires_at).getTime() <
      Date.now()
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Your verification code has expired. Please request a new one.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({
          error:
            "Too many incorrect OTP attempts. Please request a new code.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const submittedHash =
      await hashOTP(otp);

    if (
      submittedHash !== otpRecord.otp_hash
    ) {
      const newAttempts =
        otpRecord.attempts + 1;

      await supabaseAdmin
        .from("login_otps")
        .update({
          attempts: newAttempts,
        })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          error:
            "Incorrect verification code.",
          attemptsRemaining:
            Math.max(0, 5 - newAttempts),
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    await supabaseAdmin
      .from("login_otps")
      .update({
        verified: true,
      })
      .eq("id", otpRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "OTP verified successfully.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Verify OTP error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
