import crypto from "crypto";

function getOtpSecret() {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error("OTP_SECRET is not set in environment variables");
  }
  return secret;
}

/**
 * Generates a 6-digit OTP with leading zeros.
 * Uses cryptographically secure random number generation.
 * @returns {string} 6-digit OTP string
 */
export function generateOtp() {
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  
  // Only log in development when SMTP is disabled (for testing)
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_ENABLED) {
    console.log(`[DEV] Generated OTP: ${otp}`);
  }
  
  return otp;
}

/**
 * Hashes an OTP using HMAC-SHA256 with OTP_SECRET.
 * Never stores plain-text OTP.
 * @param {string} otp - The 6-digit OTP to hash
 * @returns {string} Hex-encoded HMAC-SHA256 hash
 */
export function hashOtp(otp) {
  if (!otp || typeof otp !== "string") {
    throw new Error("OTP must be a non-empty string");
  }
  
  const secret = getOtpSecret();
  return crypto.createHmac("sha256", secret)
    .update(otp)
    .digest("hex");
}

/**
 * Verifies an OTP against its hash using constant-time comparison.
 * Checks input lengths first to prevent timing attacks.
 * @param {string} otp - The plain-text OTP to verify
 * @param {string} hashedOtp - The stored HMAC-SHA256 hash
 * @returns {boolean} True if OTP matches, false otherwise
 */
export function verifyOtp(otp, hashedOtp) {
  if (!otp || !hashedOtp || typeof otp !== "string" || typeof hashedOtp !== "string") {
    return false;
  }
  
  // Check input lengths first to prevent timing attacks
  if (otp.length !== 6 || hashedOtp.length !== 64) { // SHA256 hex = 64 chars
    return false;
  }
  
  const computedHash = hashOtp(otp);
  
  // Use timingSafeEqual for constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(hashedOtp, "hex")
    );
  } catch {
    return false;
  }
}