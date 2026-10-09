import { vi, describe, test, expect } from "vitest";

// Set environment variables before module import
vi.hoisted(() => {
  process.env.OTP_SECRET = "test_secret_key_12345678901234567890123456789012";
  process.env.NODE_ENV = "test";
});

import { generateOtp, hashOtp, verifyOtp } from "../otp";

describe("OTP Utilities", () => {
  describe("generateOtp", () => {
    test("returns a 6-digit string", () => {
      const otp = generateOtp();
      expect(typeof otp).toBe("string");
      expect(otp.length).toBe(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test("includes leading zeros when needed", () => {
      const otps = new Set();
      for (let i = 0; i < 1000; i++) {
        const otp = generateOtp();
        expect(otp.length).toBe(6);
        otps.add(otp);
      }
      expect(otps.size).toBeGreaterThan(900);
    });

    test("generates different OTPs on each call", () => {
      const otp1 = generateOtp();
      const otp2 = generateOtp();
      expect(otp1).not.toBe(otp2);
    });

    test("pads with leading zeros", () => {
      const otp = generateOtp();
      expect(otp.length).toBe(6);
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe("hashOtp", () => {
    test("returns a 64-character hex string (SHA256)", () => {
      const otp = "123456";
      const hash = hashOtp(otp);
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    test("produces different hashes for different OTPs", () => {
      const hash1 = hashOtp("123456");
      const hash2 = hashOtp("654321");
      expect(hash1).not.toBe(hash2);
    });

    test("produces same hash for same OTP", () => {
      const hash1 = hashOtp("123456");
      const hash2 = hashOtp("123456");
      expect(hash1).toBe(hash2);
    });

    test("throws error for empty OTP", () => {
      expect(() => hashOtp("")).toThrow("OTP must be a non-empty string");
      expect(() => hashOtp(null)).toThrow("OTP must be a non-empty string");
      expect(() => hashOtp(undefined)).toThrow("OTP must be a non-empty string");
      expect(() => hashOtp(123)).toThrow("OTP must be a non-empty string");
    });
  });

  describe("verifyOtp", () => {
    test("returns true for correct OTP", () => {
      const otp = "123456";
      const result = verifyOtp(otp, hashOtp(otp));
      expect(result).toBe(true);
    });

    test("returns false for incorrect OTP", () => {
      const result = verifyOtp("123456", hashOtp("654321"));
      expect(result).toBe(false);
    });

    test("returns false for wrong OTP with same length", () => {
      const hashed = hashOtp("123456");
      const result = verifyOtp("654321", hashed);
      expect(result).toBe(false);
    });

    test("returns false for OTP with wrong length", () => {
      const hashed = hashOtp("123456");
      expect(verifyOtp("12345", hashed)).toBe(false);
      expect(verifyOtp("1234567", hashed)).toBe(false);
      expect(verifyOtp("", hashed)).toBe(false);
    });

    test("returns false for hashed OTP with wrong length", () => {
      expect(verifyOtp("123456", "short")).toBe(false);
      expect(verifyOtp("123456", "a".repeat(63))).toBe(false);
      expect(verifyOtp("123456", "a".repeat(65))).toBe(false);
      expect(verifyOtp("123456", "")).toBe(false);
    });

    test("returns false for null/undefined inputs", () => {
      const hashed = hashOtp("123456");
      expect(verifyOtp(null, hashed)).toBe(false);
      expect(verifyOtp(undefined, hashed)).toBe(false);
      expect(verifyOtp("123456", null)).toBe(false);
      expect(verifyOtp("123456", undefined)).toBe(false);
      expect(verifyOtp(null, null)).toBe(false);
    });

    test("returns false for non-string inputs", () => {
      const hashed = hashOtp("123456");
      expect(verifyOtp(123456, hashed)).toBe(false);
      expect(verifyOtp("123456", 123)).toBe(false);
      expect(verifyOtp({}, hashed)).toBe(false);
    });

    test("uses constant-time comparison (timingSafeEqual)", () => {
      const otp = "123456";
      const hashed = hashOtp(otp);
      expect(() => verifyOtp(otp, hashed)).not.toThrow();
      expect(() => verifyOtp("wrong", hashed)).not.toThrow();
    });

    test("rejects OTPs with non-digit characters", () => {
      const hashed = hashOtp("123456");
      expect(verifyOtp("12345a", hashed)).toBe(false);
      expect(verifyOtp("12345!", hashed)).toBe(false);
    });
  });

  describe("Integration", () => {
    test("full flow: generate -> hash -> verify", () => {
      const otp = generateOtp();
      const hashed = hashOtp(otp);
      expect(verifyOtp(otp, hashed)).toBe(true);
    });

    test("different OTPs produce different hashes", () => {
      const otp1 = generateOtp();
      const otp2 = generateOtp();
      expect(hashOtp(otp1)).not.toBe(hashOtp(otp2));
    });

    test("OTP_SECRET change invalidates previous hashes", () => {
      const otp = "123456";
      const hashed = hashOtp(otp);
      
      process.env.OTP_SECRET = "different_secret_key_123456789012345678901234";
      
      const newHashed = hashOtp(otp);
      expect(newHashed).not.toBe(hashed);
      
      expect(verifyOtp(otp, hashed)).toBe(false);
    });
  });
});