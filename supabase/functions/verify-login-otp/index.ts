import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Must be the same secret create-login-otp uses.
const OTP_SECRET = Deno.env.get('OTP_SECRET') || SERVICE_ROLE_KEY
const MAX_ATTEMPTS = 5

// Rate limiting (per function instance)
const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX_REQUESTS = 10
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

    // login_otps is service-role only, so the database is accessed with the service role key.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    let body: { otp?: unknown } = {}
    try { body = await req.json() } catch { /* handled below */ }
    const otp = body?.otp?.toString().trim()

    if (!otp || !/^\d{6}$/.test(otp)) {
      return json({ error: 'Invalid OTP format' }, 400)
    }

    const { data: otpRecord, error: otpError } = await admin
      .from('login_otps')
      .select('id, otp_hash, expires_at, attempts')
      .eq('user_id', user.id)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError) {
      console.error('Lookup OTP error:', otpError)
      return json({ error: 'Could not check the verification code. Please try again.' }, 500)
    }
    if (!otpRecord) {
      return json({ error: 'Invalid or expired verification code. Request a new code.' }, 400)
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await admin.from('login_otps').delete().eq('id', otpRecord.id)
      return json({ error: 'Too many attempts. Please request a new code.' }, 400)
    }

    const otpHash = await hashOTP(otp, user.id)

    if (!timingSafeEqual(otpRecord.otp_hash, otpHash)) {
      await admin
        .from('login_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)

      return json({ error: 'Incorrect verification code' }, 400)
    }

    await admin
      .from('login_otps')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    return json({ success: true })
  } catch (error) {
    console.error('Edge function error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
})

// HMAC-SHA256 of "<userId>:<otp>". Must match create-login-otp.
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
