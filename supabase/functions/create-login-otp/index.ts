import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@haciendaamara.com'
const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'Hacienda Amara'
const OTP_EXPIRY_MINUTES = 5

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5
const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(ip) || []
  const recent = requests.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return true
}

serve(async (req) => {
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, role, deleted_at')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.deleted_at) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['staff', 'admin'].includes(profile?.role)) {
      return new Response(JSON.stringify({ error: 'OTP not required for this role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseClient
      .from('login_otps')
      .insert({
        user_id: user.id,
        email: profile.email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Insert OTP error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailSent = await sendOTPEmail(profile.email, otp)
    if (!emailSent) {
      await supabaseClient.from('login_otps').delete().eq('user_id', user.id).eq('verified', false)
      return new Response(JSON.stringify({ error: 'Failed to send verification email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured')
    return false
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        to: [{ email }],
        subject: 'Your Hacienda Amara Login Verification Code',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6b4b2a 0%, #9a6a3c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">Hacienda Amara</h1>
              <p style="color: #f8e8d2; margin: 10px 0 0;">Private Resort & Events Place</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #333; margin-top: 0;">Login Verification Code</h2>
              <p>We received a login attempt for your account. Please use the verification code below to complete your login:</p>
              <div style="background: #f8e8d2; border: 2px dashed #9a6a3c; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6b4b2a; font-family: 'Courier New', monospace;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 14px;">This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
              <p style="color: #666; font-size: 14px;">If you didn't attempt to log in, please ignore this email or contact support.</p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 25px 0;">
              <p style="color: #999; font-size: 12px; margin: 0;">Hacienda Amara Private Resort<br>Amityville, Brgy. San Jose, Rodriguez, Rizal</p>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Brevo API error:', errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}