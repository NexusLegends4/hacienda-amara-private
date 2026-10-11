import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Secret used to HMAC the code. Falls back to the service role key so no extra setup is required.
const OTP_SECRET = Deno.env.get('OTP_SECRET') || SERVICE_ROLE_KEY

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
// Must be a sender that is verified in Brevo (Senders, Domains & Dedicated IPs).
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL')
const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'Hacienda Amara'
const OTP_EXPIRY_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 30

// Rate limiting (per function instance)
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

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!checkRateLimit(clientIP)) {
    return json({ error: 'Too many requests. Please wait.' }, 429)
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function')
      return json({ error: 'Server is not configured correctly.' }, 500)
    }
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
      console.error('BREVO_API_KEY or BREVO_SENDER_EMAIL is not set in the Edge Function secrets')
      return json({
        error: 'Email service is not configured.',
        hint: 'Set BREVO_API_KEY and BREVO_SENDER_EMAIL in the Supabase Edge Function secrets.',
      }, 500)
    }

    // The login_otps table is service-role only (see 20261007_login_otps_table.sql),
    // so database access must use the service role key. The caller is still identified
    // by validating their own access token below.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('email, role, deleted_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.deleted_at) {
      return json({ error: 'Account not found' }, 404)
    }

    if (!['staff', 'admin'].includes(profile.role)) {
      return json({ error: 'OTP not required for this role' }, 400)
    }

    const targetEmail = (profile.email || user.email || '').trim()
    if (!targetEmail) {
      return json({ error: 'No email address is saved for this account.' }, 400)
    }

    // Per-user cooldown so the endpoint cannot be used to spam an inbox.
    const { data: recent } = await admin
      .from('login_otps')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent?.created_at) {
      const ageSeconds = (Date.now() - new Date(recent.created_at).getTime()) / 1000
      if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
        return json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds)}s before requesting another code.` }, 429)
      }
    }

    const otp = generateOTP()
    const otpHash = await hashOTP(otp, user.id)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

    // Only the newest code may be valid.
    await admin.from('login_otps').delete().eq('user_id', user.id).eq('verified', false)

    const { error: insertError } = await admin
      .from('login_otps')
      .insert({
        user_id: user.id,
        email: targetEmail,
        otp_hash: otpHash,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Insert OTP error:', insertError)
      return json({
        error: 'Failed to create OTP',
        hint: insertError.code === '42P01'
          ? 'The login_otps table is missing. Run supabase/20261007_login_otps_table.sql.'
          : undefined,
      }, 500)
    }

    const sendResult = await sendOTPEmail(targetEmail, otp)
    if (!sendResult.ok) {
      await admin.from('login_otps').delete().eq('user_id', user.id).eq('verified', false)
      return json({ error: 'Failed to send verification email', hint: sendResult.hint }, 502)
    }

    return json({ success: true })
  } catch (error) {
    console.error('Edge function error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
})

// Uniformly random 6-digit code from the Web Crypto RNG (no modulo bias).
function generateOTP(): string {
  const limit = 4_294_000_000 // largest multiple of 1,000,000 that fits in 32 bits
  const buf = new Uint32Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0] >= limit)
  return (buf[0] % 1_000_000).toString().padStart(6, '0')
}

// HMAC-SHA256 so a leaked table cannot be brute-forced offline. Must match verify-login-otp.
async function hashOTP(otp: string, userId: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OTP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${userId}:${otp}`))
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type SendResult = { ok: true } | { ok: false; hint: string }

async function sendOTPEmail(email: string, otp: string): Promise<SendResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        to: [{ email }],
        subject: `${otp} is your Hacienda Amara verification code`,
        textContent: `Your Hacienda Amara login verification code is ${otp}.\n\nIt expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not try to log in, you can ignore this email.`,
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
              <p style="color: #f8e8d2; margin: 10px 0 0;">Private Resort &amp; Events Place</p>
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

    if (response.ok) return { ok: true }

    const raw = await response.text()
    console.error('Brevo API error:', response.status, raw)

    let message = ''
    try { message = JSON.parse(raw)?.message ?? '' } catch { /* not JSON */ }

    if (response.status === 401) {
      return { ok: false, hint: 'Brevo rejected the API key. Check BREVO_API_KEY, and turn off Brevo "Authorised IPs" restrictions (Security) so Supabase can connect.' }
    }
    if (response.status === 403) {
      return { ok: false, hint: 'Brevo refused the request. Transactional email may not be activated on this Brevo account yet, or an IP restriction is blocking Supabase.' }
    }
    if (response.status === 400 && /sender/i.test(message)) {
      return { ok: false, hint: 'The sender address is not verified in Brevo. Verify BREVO_SENDER_EMAIL under Senders, Domains & Dedicated IPs.' }
    }
    if (response.status === 400 && /email/i.test(message)) {
      return { ok: false, hint: 'Brevo rejected the recipient email address.' }
    }
    if (response.status === 429) {
      return { ok: false, hint: 'Brevo sending limit reached. Try again later.' }
    }
    return { ok: false, hint: `Brevo returned an error (${response.status}). Check the Edge Function logs.` }
  } catch (error) {
    console.error('Email send error:', error)
    const timedOut = (error as Error)?.name === 'AbortError'
    return { ok: false, hint: timedOut ? 'The email service took too long to respond.' : 'Could not reach the email service.' }
  } finally {
    clearTimeout(timer)
  }
}
