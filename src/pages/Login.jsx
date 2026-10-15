import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { hasStaffVerificationClaim } from "../utils/staff-auth";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;
const ATTEMPTS_KEY = "hacienda-login-attempts";
const LOCKOUT_KEY = "hacienda-login-lockout";

const MFA_PENDING_KEY = "hacienda_staff_mfa_pending";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOAuthFlow = searchParams.get("oauth") === "true";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  const [showMfa, setShowMfa] = useState(false);
  const [showMethodChoice, setShowMethodChoice] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailOtpAddress, setEmailOtpAddress] = useState("");
  const [emailOtpNotice, setEmailOtpNotice] = useState("");
  const [mfaMode, setMfaMode] = useState("challenge");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    const storedAttempts = parseInt(
      localStorage.getItem(ATTEMPTS_KEY) || "0",
      10
    );

    const storedLockout = Number(
      localStorage.getItem(LOCKOUT_KEY) || "0"
    );

    const now = Date.now();

    if (storedLockout > now) {
      setLockoutUntil(storedLockout);
      setAttempts(storedAttempts);
    } else {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
      setAttempts(0);
      setLockoutUntil(null);
    }
  }, []);

  useEffect(() => {
    if (!lockoutUntil) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = lockoutUntil - Date.now();

      if (remaining <= 0) {
        setLockoutUntil(null);
        setAttempts(0);

        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const startMfa = useCallback(async () => {
    setMfaLoading(true);
    setMfaError("");
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const verifiedFactor = factors.totp[0];
      if (verifiedFactor) {
        setMfaMode("challenge");
        setMfaFactorId(verifiedFactor.id);
        setMfaQrCode("");
        setMfaSecret("");
      } else {
        const unverifiedFactors = factors.all.filter(
          (factor) => factor.factor_type === "totp" && factor.status === "unverified"
        );
        for (const factor of unverifiedFactors) {
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (unenrollError) throw unenrollError;
        }

        const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: "Hacienda Amara",
          friendlyName: "Hacienda Amara staff sign-in",
        });
        if (enrollError) throw enrollError;

        setMfaMode("enroll");
        setMfaFactorId(enrollment.id);
        setMfaQrCode(enrollment.totp.qr_code);
        setMfaSecret(enrollment.totp.secret);
      }

      localStorage.setItem(MFA_PENDING_KEY, "true");
      setShowMethodChoice(false);
      setMfaCode("");
      setShowMfa(true);
    } catch (error) {
      setMfaError(error?.message || "Unable to set up authenticator verification. Please try again.");
      throw error;
    } finally {
      setMfaLoading(false);
    }
  }, []);

  const continueWithEmailOtp = async () => {
    setIsSubmitting(true);
    setLoginError("");
    setMfaError("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const sessionUser = sessionData.session?.user;
      const email = sessionUser?.email;
      if (!sessionUser || !email) {
        throw new Error("Your account does not have an email address for verification.");
      }

      setEmailOtpAddress(email);
      setEmailOtpNotice("");

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;

      localStorage.setItem(MFA_PENDING_KEY, "true");
      setMfaCode("");
      setShowMethodChoice(false);
      setShowEmailOtp(true);
    } catch (error) {
      console.error("Email OTP request failed:", error);
      setMfaError(error?.message || "Unable to send a sign-in code to your email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(mfaCode)) {
      setMfaError("Enter the 6-digit code sent to your email.");
      return;
    }

    setMfaLoading(true);
    setMfaError("");
    try {
      const { data: currentSession, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const expectedUserId = currentSession.session?.user?.id;
      if (!expectedUserId || currentSession.session?.user?.email !== emailOtpAddress) {
        throw new Error("Your login session changed. Sign in again to request a new code.");
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: emailOtpAddress,
        token: mfaCode,
        type: "email",
      });
      if (error) throw error;
      if (data.user?.id !== expectedUserId) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error("Could not end mismatched email OTP session:", signOutError);
        }
        throw new Error("The verification code did not match your signed-in account. Sign in again.");
      }
      if (
        !data.session?.access_token ||
        !hasStaffVerificationClaim(data.session.access_token)
      ) {
        await supabase.auth.signOut();
        throw new Error("Email verification did not complete. Request a new code and try again.");
      }

      localStorage.removeItem(MFA_PENDING_KEY);
      setMfaCode("");
      setShowEmailOtp(false);
      setEmailOtpNotice("");
      navigate("/");
    } catch (error) {
      console.error("Email OTP verification failed:", error);
      setMfaError(error?.message || "That email code is invalid or expired.");
    } finally {
      setMfaLoading(false);
    }
  };

  const mfaTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isOAuthFlow || showMfa || showMethodChoice || showEmailOtp || isSubmitting || mfaLoading || mfaTriggeredRef.current) return;
    mfaTriggeredRef.current = true;

    const continueOAuthMfa = async () => {
      setIsSubmitting(true);
      setLoginError("");
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error("No active login session was found. Please try again.");

        const { data: oauthProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role, deleted_at")
          .eq("id", session.user.id)
          .single();
        if (profileError || oauthProfile?.deleted_at) throw new Error("Unable to load your account. Please try again.");

        if (!["staff", "admin"].includes(oauthProfile?.role)) {
          localStorage.removeItem(MFA_PENDING_KEY);
          navigate("/");
          return;
        }
        setEmailOtpAddress(session.user.email || "");
        localStorage.setItem(MFA_PENDING_KEY, "true");
        setShowMethodChoice(true);
      } catch (error) {
        console.error("OAuth MFA setup error:", error);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error("Unable to sign out after MFA setup failure:", signOutError);
        localStorage.removeItem(MFA_PENDING_KEY);
        setLoginError(error?.message || "Unable to set up authenticator verification. Please try again.");
        navigate("/log-in", { replace: true });
      } finally {
        setIsSubmitting(false);
      }
    };

    continueOAuthMfa();
  }, [isOAuthFlow, showMfa, showMethodChoice, showEmailOtp, isSubmitting, mfaLoading, navigate]);

  const formatLockoutTime = (milliseconds) => {
    const minutes = Math.ceil(milliseconds / 60000);

    return `${minutes} minute${
      minutes !== 1 ? "s" : ""
    }`;
  };

  const handleOAuthLogin = async (provider) => {
    setLoginError("");
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google sign-in could not be started:", error);
      setLoginError(error?.message || "Unable to start Google sign-in. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleVerifyMfa = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(mfaCode)) {
      setMfaError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setMfaLoading(true);
      setMfaError("");
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      });
      if (error) throw error;

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== "aal2") {
        throw new Error("Authenticator verification did not complete. Please try again.");
      }

      localStorage.removeItem(MFA_PENDING_KEY);
      setShowMfa(false);
      setShowMethodChoice(false);
      setShowEmailOtp(false);
      setEmailOtpNotice("");
      setMfaCode("");
      setMfaQrCode("");
      setMfaSecret("");
      setEmailOtpAddress("");
      navigate("/");
    } catch (error) {
      console.error("Authenticator verification error:", error);
      setMfaError(error?.message || "Incorrect authenticator code. Try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setIsSubmitting(true);
    setMfaError("");
    setEmailOtpNotice("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailOtpAddress,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setEmailOtpNotice("A new code was sent. Check your email.");
    } catch (error) {
      setMfaError(error?.message || "Unable to resend the email code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMfa = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Sign out error:", error);
      setMfaError(error?.message || "Unable to cancel login.");
      return;
    }

    localStorage.removeItem(MFA_PENDING_KEY);
    setShowMfa(false);
    setShowMethodChoice(false);
    setShowEmailOtp(false);
    setEmailOtpNotice("");
    setMfaCode("");
    setMfaError("");
    setMfaFactorId("");
    setMfaQrCode("");
    setMfaSecret("");
    setEmailOtpAddress("");
    setLoginError("");
    navigate("/log-in", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      lockoutUntil &&
      lockoutUntil > Date.now()
    ) {
      setLoginError(
        `Too many attempts. Try again in ${formatLockoutTime(
          lockoutUntil - Date.now()
        )}.`
      );

      return;
    }

    const formData = new FormData(
      event.currentTarget
    );

    const loginForm = {
      email: String(
        formData.get("email") || ""
      ).trim(),
      password: String(
        formData.get("password") || ""
      ),
    };

    setIsSubmitting(true);
    setLoginError("");

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        let errorMessage =
          error.message;

        if (
          error.code ===
            "invalid_credentials" ||
          error.message.includes(
            "Invalid login credentials"
          ) ||
          error.message.includes(
            "Invalid email or password"
          ) ||
          error.message.includes(
            "User not found"
          ) ||
          error.message.includes(
            "Wrong password"
          ) ||
          error.message.includes(
            "Invalid credentials"
          ) ||
          error.message.includes(
            "AuthApiError"
          )
        ) {
          const newAttempts =
            attempts + 1;

          setAttempts(newAttempts);

          localStorage.setItem(
            ATTEMPTS_KEY,
            String(newAttempts)
          );

          if (
            newAttempts >=
            MAX_ATTEMPTS
          ) {
            const until =
              Date.now() +
              LOCKOUT_MINUTES *
                60 *
                1000;

            setLockoutUntil(until);

            localStorage.setItem(
              LOCKOUT_KEY,
              String(until)
            );

            errorMessage =
              `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`;
          } else {
            errorMessage =
              "Incorrect email or password. Please try again.";
          }
        } else if (
          error.message.includes(
            "Email not confirmed"
          )
        ) {
          errorMessage =
            "Please verify your email address before logging in.";
        } else if (
          error.message.includes(
            "Too many requests"
          )
        ) {
          errorMessage =
            "Too many login attempts. Please try again later.";
        }

        setLoginError(errorMessage);
        setIsSubmitting(false);

        return;
      }

      localStorage.removeItem(
        ATTEMPTS_KEY
      );

      localStorage.removeItem(
        LOCKOUT_KEY
      );

      setAttempts(0);
      setLockoutUntil(null);

      if (!data?.user) {
        setLoginError(
          "Unable to log in. Please try again."
        );

        setIsSubmitting(false);
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "firstname, lastname, email, role, deleted_at"
        )
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();

        setLoginError(
          profileError.message ||
            "Unable to load your profile."
        );

        setIsSubmitting(false);
        return;
      }

      if (profileData?.deleted_at) {
        await supabase.auth.signOut();

        setLoginError(
          "This account has been deleted. Please contact the administrator."
        );

        setIsSubmitting(false);
        return;
      }

      // Staff and admins must complete either TOTP or email OTP verification.
      if (!["staff", "admin"].includes(profileData?.role)) {
        navigate("/");
        return;
      }

      localStorage.setItem(MFA_PENDING_KEY, "true");
      setEmailOtpAddress(data.user.email || profileData.email || "");
      setShowMethodChoice(true);

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setLoginError(
        error?.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout hideNav>
      <div
        className="
          relative
          left-1/2
          right-1/2
          -mx-[50vw]
          w-screen
          min-h-screen
          min-h-[100dvh]
          overflow-x-hidden
          overflow-y-auto
          flex
          items-start
          sm:items-center
          justify-center
          px-3
          sm:px-4
          md:px-6
          lg:px-8
          py-4
          sm:py-8
          bg-[#efeae1]
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-[#5d3f2b]/35
            via-[#9d7e59]/20
            to-[#efeae1]/80
          "
        />
        <div
          className="
            relative
            w-full
            max-w-[360px]
            sm:max-w-[420px]
            md:max-w-[470px]
            flex
            items-center
            justify-center
            px-3
            sm:px-4
            md:px-6
          "
        >
          <div
            className="
              w-full
              rounded-[30px]
              border
              border-white/30
              bg-[#f3f1ef]
              p-5
              sm:p-6
              md:p-7
              text-slate-900
              shadow-[0_28px_64px_rgba(32,24,18,0.18)]
              backdrop-blur-xl
            "
          >
            {showMethodChoice ? (
              <>
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <svg viewBox="0 0 64 64" className="h-16 w-16 text-slate-900" aria-hidden="true">
                      <path
                        d="M17 33.5L27 44L48 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h1 className="text-[2rem] sm:text-[2.25rem] font-black tracking-[-0.06em] text-slate-900 leading-none">
                    Verify Your Sign In
                  </h1>
                  <p className="mt-3 text-sm sm:text-base text-slate-700 leading-relaxed">
                    Choose an authenticator code or a one-time code sent to your account email.
                  </p>
                </div>
                {mfaError && <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm" role="alert">{mfaError}</div>}
                <div className="mt-7 grid gap-3">
                  <button
                    type="button"
                    onClick={() => startMfa().catch(() => {})}
                    disabled={mfaLoading || isSubmitting}
                    className="btn btn-black h-14 min-h-14 w-full rounded-full text-base font-semibold border-0 shadow-none"
                  >
                    {mfaLoading ? <span className="loading loading-spinner loading-sm" /> : null}
                    Use authenticator app
                  </button>
                  <button
                    type="button"
                    onClick={continueWithEmailOtp}
                    disabled={mfaLoading || isSubmitting}
                    className="btn h-14 min-h-14 w-full rounded-full border-0 bg-[#dfe1df] text-slate-900 text-base font-semibold hover:bg-[#d2d7d4] shadow-none"
                  >
                    {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : null}
                    Send a code to {emailOtpAddress || "your account email"}
                  </button>
                </div>
                <p className="mt-4 text-center text-xs leading-5 text-slate-600">
                  Email codes are valid for one sign-in. Check your inbox and spam folder.
                </p>
                <div className="mt-5 text-center">
                  <button type="button" onClick={handleCancelMfa} disabled={isSubmitting || mfaLoading} className="btn btn-ghost btn-sm rounded-full text-slate-700 hover:bg-slate-200/60">Cancel Login</button>
                </div>
              </>
            ) : showEmailOtp ? (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-4">@</div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                    Check Your Email
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-700">
                    Enter the 6-digit sign-in code sent to <strong>{emailOtpAddress}</strong>.
                  </p>
                </div>
                {mfaError && <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm" role="alert">{mfaError}</div>}
                {emailOtpNotice && <div className="mt-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm" role="status">{emailOtpNotice}</div>}
                <form onSubmit={handleVerifyEmailOtp} className="mt-6">
                  <label htmlFor="login-email-otp-code" className="mb-2 block text-sm font-bold text-slate-800">6-digit email code</label>
                  <input
                    id="login-email-otp-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
                    maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={mfaCode}
                    onChange={(event) => { setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setMfaError(""); }}
                    className="input input-bordered w-full h-14 rounded-2xl text-center text-2xl tracking-[0.5em] font-bold" autoFocus required
                  />
                  <button type="submit" disabled={mfaLoading || mfaCode.length !== 6} className="btn btn-black mt-5 h-12 min-h-12 w-full rounded-full">
                    {mfaLoading ? <span className="loading loading-spinner loading-sm" /> : null}
                    Verify Email & Sign In
                  </button>
                </form>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleResendEmailOtp}
                    disabled={isSubmitting || mfaLoading}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    {isSubmitting ? "Sending..." : "Resend code"}
                  </button>
                  <button type="button" onClick={handleCancelMfa} disabled={mfaLoading || isSubmitting} className="btn btn-ghost btn-sm rounded-full">Cancel Login</button>
                </div>
              </>
            ) : !showMfa ? (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="
                      flex items-center gap-2
                      text-sm font-medium text-slate-700
                      hover:underline
                      transition-colors
                    "
                  >
                    ← Back to Home
                  </button>
                </div>
                <h1
                  className="
                    text-2xl
                    sm:text-3xl
                    md:text-4xl
                    lg:text-5xl
                    font-black
                    tracking-tight
                    text-slate-900
                  "
                >
                  Log In
                </h1>
                <p className="mt-2 text-slate-600">
                  Enter your credentials to access your account
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  {loginError && (
                    <div
                      className="
                        rounded-xl
                        bg-rose-50
                        border
                        border-rose-200
                        p-4
                        text-sm
                        text-rose-700
                      "
                    >
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                      </span>
                      <Input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        maxLength={254}
                        required
                        className="w-full"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Password
                      </span>
                      <Input
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        maxLength={128}
                        required
                        className="w-full"
                      />
                    </label>
                    <div className="text-right">
                      <Link
                        to="/forgot-password"
                        className="text-sm font-semibold text-amber-800 underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  {lockoutUntil && lockoutUntil > Date.now() && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                      Account locked. Try again in {formatLockoutTime(lockoutUntil - Date.now())}.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="
                      w-full
                      rounded-xl
                      bg-black
                      text-white
                      py-2.5
                      sm:py-3
                      font-semibold
                      text-sm
                      sm:text-base
                      transition-colors duration-150
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      hover:bg-black/90
                      focus:outline-none
                      focus:ring-2
                      focus:ring-black
                      focus:ring-offset-2
                      min-w-[180px]
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                <div className="mt-8">
                  <div className="relative">
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-transparent text-slate-500">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin("google")}
                      disabled={isSubmitting}
                      className="
                        flex
                        items-center
                        justify-center
                        gap-3
                        rounded-xl
                        bg-transparent
                        py-3
                        text-sm
                        font-medium
                        text-slate-700
                        transition-colors duration-150
                        hover:bg-slate-50
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                        focus:outline-none
                        focus:ring-2
                        focus:ring-black
                        focus:ring-offset-2
                      "
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Google</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-4">{mfaMode === "enroll" ? "1" : "2"}</div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                    {mfaMode === "enroll" ? "Set Up Authenticator" : "Authenticator Verification"}
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-700">
                    {mfaMode === "enroll" ? "Scan this QR code with Google Authenticator, Microsoft Authenticator, or another authenticator app." : "Enter the current 6-digit code from your authenticator app."}
                  </p>
                </div>
                {mfaError && <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm" role="alert">{mfaError}</div>}
                {mfaMode === "enroll" && (
                  <div className="mt-6 text-center">
                    <img src={mfaQrCode} alt="Authenticator app setup QR code" className="mx-auto h-48 w-48 rounded-lg border border-slate-200 bg-white p-2" />
                    <p className="mt-4 text-sm text-slate-700">If you cannot scan the QR code, enter this setup key manually:</p>
                    <p className="mt-2 break-all rounded-lg bg-slate-100 p-3 font-mono text-sm font-semibold tracking-wider" aria-label="Authenticator setup key">{mfaSecret}</p>
                  </div>
                )}
                <form onSubmit={handleVerifyMfa} className="mt-6">
                  <label htmlFor="login-mfa-code" className="mb-2 block text-sm font-bold text-slate-800">6-digit authenticator code</label>
                  <input
                    id="login-mfa-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
                    maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={mfaCode}
                    onChange={(event) => { setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setMfaError(""); }}
                    className="input input-bordered w-full h-14 rounded-2xl text-center text-2xl tracking-[0.5em] font-bold" autoFocus required
                  />
                  <p className="mt-3 text-center text-xs sm:text-sm text-slate-600">
                    {mfaMode === "enroll" ? "Enter a code from the app to finish setup. The app generates a new code every 30 seconds." : "Your authenticator app generates a new code every 30 seconds."}
                  </p>
                  <button type="submit" disabled={mfaLoading || mfaCode.length !== 6 || !mfaFactorId} className="btn btn-black mt-5 h-12 min-h-12 w-full rounded-full">
                    {mfaLoading ? <span className="loading loading-spinner loading-sm" /> : null}
                    {mfaMode === "enroll" ? "Finish Setup & Sign In" : "Verify & Sign In"}
                  </button>
                </form>
                <div className="mt-5 text-center">
                  <button type="button" onClick={handleCancelMfa} disabled={mfaLoading} className="btn btn-ghost btn-sm rounded-full">Cancel Login</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;