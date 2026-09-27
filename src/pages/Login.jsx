import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { recordAuthNotification } from "../utils/auth-service";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;
const ATTEMPTS_KEY = "hacienda-login-attempts";
const LOCKOUT_KEY = "hacienda-login-lockout";

const Login = () => {
  const { profile } = useContext(SessionContext);
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  // Initialize attempts / lockout from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedAttempts = parseInt(
      localStorage.getItem(ATTEMPTS_KEY) || "0",
      10
    );

    const storedLockout = localStorage.getItem(LOCKOUT_KEY);
    const now = Date.now();

    if (storedLockout && storedLockout > now) {
      setLockoutUntil(Number(storedLockout));
      setAttempts(storedAttempts);
    } else if (storedLockout && storedLockout <= now) {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);

      setAttempts(0);
      setLockoutUntil(null);
    } else {
      setAttempts(storedAttempts);
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutUntil) return;

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

  const formatLockoutTime = (ms) => {
    const minutes = Math.ceil(ms / 60000);

    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    navigate("/");
  }, [profile, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check lockout
    if (lockoutUntil && lockoutUntil > Date.now()) {
      setLoginError(
        `Too many attempts. Try again in ${formatLockoutTime(
          lockoutUntil - Date.now()
        )}.`
      );

      return;
    }

    const formData = new FormData(event.target);

    setIsSubmitting(true);
    setLoginError("");

    const loginForm = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) {
      let errorMessage = error.message;

      // Supabase error codes for invalid credentials
      if (
        error.code === "invalid_credentials" ||
        error.message.includes("Invalid login credentials") ||
        error.message.includes("Invalid email or password") ||
        error.message.includes("User not found") ||
        error.message.includes("Wrong password") ||
        error.message.includes("Invalid credentials") ||
        error.message.includes("AuthApiError")
      ) {
        // Increment failed attempts
        const newAttempts = attempts + 1;

        setAttempts(newAttempts);
        localStorage.setItem(ATTEMPTS_KEY, String(newAttempts));

        if (newAttempts >= MAX_ATTEMPTS) {
          const until =
            Date.now() + LOCKOUT_MINUTES * 60 * 1000;

          setLockoutUntil(until);
          localStorage.setItem(LOCKOUT_KEY, String(until));

          errorMessage = `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`;
        } else {
          errorMessage =
            "Incorrect email or password. Please try again.";
        }
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage =
          "Please verify your email address before logging in.";
      } else if (error.message.includes("Too many requests")) {
        errorMessage =
          "Too many login attempts. Please try again later.";
      }

      setLoginError(errorMessage);
      setIsSubmitting(false);

      return;
    }

    // Success - reset attempts
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);

    setAttempts(0);
    setLockoutUntil(null);

    if (data?.user) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("firstname, lastname, email, role, deleted_at")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        alert(profileError.message || profileError);
        setIsSubmitting(false);

        return;
      }

      if (profileData?.deleted_at) {
        await supabase.auth.signOut();

        alert(
          "This account has been deleted. Please contact the administrator."
        );

        setIsSubmitting(false);

        return;
      }

      await recordAuthNotification(supabase, {
        eventType: "login",
        profileId: data.user.id,
        name: [
          profileData.firstname,
          profileData.lastname,
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
        email: profileData.email || loginForm.email,
      });

      navigate("/");
    }

    setIsSubmitting(false);
  };

  return (
    <MainLayout>

      {/* =========================================
          LOGIN PAGE
          FULL VIEWPORT - NO PAGE SCROLL
      ========================================== */}
      <div
        className="
          relative
          left-1/2
          right-1/2
          -mx-[50vw]
          w-screen
          h-[calc(100vh-92px)]
          overflow-hidden
          flex
          items-center
          justify-center
          px-3
          sm:px-4
          md:px-6
          lg:px-8
          bg-[#f8e8d2]
        "
      >

        {/* BACKGROUND */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-[#6b4b2a]/35
            via-[#9a6a3c]/20
            to-[#f8e8d2]/60
          "
        />

        {/* =========================================
            LOGIN CARD CONTAINER
        ========================================== */}
        <div
          className="
            relative
            w-full
            max-w-md
            sm:max-w-lg
            md:max-w-xl
            lg:max-w-2xl
            max-h-full
            flex
            items-center
            justify-center
          "
        >

          {/* =========================================
              LOGIN CARD
          ========================================== */}
          <div
            className="
              w-full
              max-h-[calc(100vh-120px)]
              overflow-hidden
              rounded-2xl
              sm:rounded-[2rem]
              border
              border-white/30
              bg-white/40
              p-5
              sm:p-7
              md:p-8
              lg:p-10
              text-slate-900
              shadow-2xl
              backdrop-blur-xl
            "
          >

            {/* TITLE */}
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

            {/* DESCRIPTION */}
            <div
              className="
                mt-1
                sm:mt-2
                space-y-1
                text-sm
                sm:text-base
                text-slate-700
              "
            >
              <p>
                Welcome back. Please enter your details.
              </p>
            </div>

            {/* =========================================
                LOGIN FORM
            ========================================== */}
            <form
              onSubmit={handleSubmit}
              className="
                mt-5
                sm:mt-6
              "
            >

              {/* EMAIL */}
              <Input
                name="email"
                placeholder="Enter your Email"
                label="Email"
                type="email"
              />

              {/* PASSWORD */}
              <Input
                name="password"
                placeholder="Enter your Password"
                label="Password"
                type="password"
                error={loginError}
              />

              {/* =========================================
                  LOCKOUT MESSAGE
              ========================================== */}
              {lockoutUntil &&
                lockoutUntil > Date.now() && (
                  <div
                    className="
                      mb-3
                      p-3
                      rounded-xl
                      bg-rose-50
                      border
                      border-rose-200
                      text-rose-700
                      text-sm
                    "
                  >
                    ⏳ Account locked. Try again in{" "}
                    <strong>
                      {formatLockoutTime(
                        lockoutUntil - Date.now()
                      )}
                    </strong>
                    .
                  </div>
                )}

              {/* =========================================
                  LOGIN BUTTON
              ========================================== */}
              <button
                disabled={
                  isSubmitting ||
                  (lockoutUntil &&
                    lockoutUntil > Date.now())
                }
                className="
                  btn
                  btn-black
                  mt-3
                  sm:mt-5
                  h-12
                  min-h-12
                  w-full
                  rounded-full
                  px-4
                  sm:px-6
                  text-sm
                  sm:text-base
                "
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <SendIcon className="text-base" />
                )}

                {isSubmitting
                  ? " Logging in..."
                  : " Log In"}
              </button>
            </form>

            {/* FORGOT PASSWORD */}
            <Link
              to="/forgot-password"
              className="
                mt-3
                sm:mt-4
                block
                text-center
                text-sm
                font-medium
                text-slate-700
                hover:underline
              "
            >
              Forgot your password?
            </Link>

          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
