import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { useNavigate, Link } from "react-router-dom";

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

  useEffect(() => {
    console.log("Login: Profile effect triggered", { profile: !!profile, isSubmitting });
    if (profile && !isSubmitting) {
      console.log("Login: Redirecting to home");
      navigate("/");
    }
  }, [
    profile,
    isSubmitting,
    navigate,
  ]);

  const formatLockoutTime = (milliseconds) => {
    const minutes = Math.ceil(milliseconds / 60000);

    return `${minutes} minute${
      minutes !== 1 ? "s" : ""
    }`;
  };

  const handleOAuthLogin = async (provider) => {
    setLoginError("");

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (error) {
      setLoginError(error.message);
    }
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

      // Login successful - redirect based on role
      let redirectPath = "/";
      if (profileData?.role === "admin") {
        redirectPath = "/admin-reservations";
      } else if (profileData?.role === "staff") {
        redirectPath = "/admin-reservations";
      } else if (profileData?.role === "client") {
        redirectPath = "/";
      }

      console.log("Login successful, redirecting to:", redirectPath);
      navigate(redirectPath);

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
    <MainLayout>
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
          bg-[#f8ecd8]]
        "
      >
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-[#6b4b2a]/35
            via-[#9a6a3c]/20
            to-[#f8ecd8]/60
          "
        />
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
            px-3
            sm:px-4
            md:px-6
            lg:px-8
          "
        >
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

              <div className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </span>
                  <Input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
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
                    required
                    className="w-full"
                  />
                </label>
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
                  py-3
                  sm:py-4
                  font-semibold
                  transition-all
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  hover:bg-black/90
                  focus:outline-none
                  focus:ring-2
                  focus:ring-black
                  focus:ring-offset-2
                "
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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

              <div className="mt-6 grid grid-cols-2 gap-4">
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
                    border
                    border-slate-200
                    bg-white/80
                    py-3
                    text-sm
                    font-medium
                    text-slate-700
                    transition-all
                    hover:bg-slate-50
                    hover:border-slate-300
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;