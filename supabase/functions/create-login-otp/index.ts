import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OTP_EXPIRATION_MINUTES = 5;

function generateOTP() {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
}

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
    if (!BREVO_API_KEY) {
      throw new Error(
        "BREVO_API_KEY is not configured."
      );
    }

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

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "firstname, lastname, email, role"
        )
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw profileError;
    }

    if (!["staff", "admin"].includes(profile?.role)) {
      return new Response(
        JSON.stringify({ error: "Email verification is only available for staff and admin accounts." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email =
      profile?.email || user.email;

    if (!email) {
      throw new Error(
        "User email not found."
      );
    }

    const name = [
      profile?.firstname,
      profile?.lastname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Invalidate previous OTPs
    await supabaseAdmin
      .from("login_otps")
      .update({
        verified: true,
      })
      .eq("user_id", user.id)
      .eq("verified", false);

    // Generate new OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    const expiresAt = new Date(
      Date.now() +
        OTP_EXPIRATION_MINUTES *
          60 *
          1000
    ).toISOString();

    // Save OTP hash
    const { error: insertError } =
      await supabaseAdmin
        .from("login_otps")
        .insert({
          user_id: user.id,
          email,
          otp_hash: otpHash,
          expires_at: expiresAt,
          attempts: 0,
          verified: false,
        });

    if (insertError) {
      throw insertError;
    }

    // Send OTP through Brevo
    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "Hacienda Amara",
            email:
              "haciendaaamaraprivateresort@gmail.com",
          },
          to: [
            {
              email,
              name: name || "Guest",
            },
          ],
          subject:
            "Hacienda Amara - Login Verification Code",
          htmlContent: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 30px;
            ">

              <h2 style="color: #6b4b2a;">
                Hacienda Amara
              </h2>

              <p>
                Hello ${name || "Guest"},
              </p>

              <p>
                We received a login attempt
                on your Hacienda Amara account.
              </p>

              <p>
                Your verification code is:
              </p>

              <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                text-align: center;
                padding: 20px;
                margin: 20px 0;
                background: #f5f1eb;
                color: #6b4b2a;
                border-radius: 12px;
              ">
                ${otp}
              </div>

              <p>
                This code will expire in
                <strong>5 minutes</strong>.
              </p>

              <p>
                If you did not attempt to log in,
                please secure your account.
              </p>

              <hr style="
                margin: 25px 0;
                border: none;
                border-top: 1px solid #ddd;
              " />

              <p style="
                font-size: 13px;
                color: #666;
              ">
                This is an automated security
                email from Hacienda Amara.
              </p>

            </div>
          `,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "Brevo error:",
        result
      );

      return new Response(
        JSON.stringify({
          error:
            "Failed to send OTP email.",
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

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt,
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
      "Create OTP error:",
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
