import { supabase } from "../utils/supabase";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { isGmailAddress } from "../utils/contact-validation";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const callbackStarted = useRef(false);

  useEffect(() => {
    if (callbackStarted.current) return;
    callbackStarted.current = true;

    const handleAuthCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const callbackError = searchParams.get("error_description") ||
          searchParams.get("error") ||
          searchParams.get("error_code") ||
          hashParams.get("error_description");
        if (callbackError) throw new Error("Google authentication was cancelled or could not be completed.");

        const code = searchParams.get("code") || hashParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const session = sessionData.session;
        if (!session) {
          throw new Error("No Google sign-in session was established.");
        }
        if (!isGmailAddress(session.user.email)) {
          throw new Error("Only @gmail.com accounts can sign in.");
        }

        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role, deleted_at")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        let profile = existingProfile;
        if (!profile) {
          const fullName = String(session.user.user_metadata?.full_name || session.user.user_metadata?.name || "").trim();
          const [firstname = "", ...lastnameParts] = fullName.split(/\s+/);
          const { data: insertedProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: session.user.id,
              email: session.user.email,
              firstname: session.user.user_metadata?.given_name || firstname || session.user.email?.split("@")[0] || "User",
              lastname: session.user.user_metadata?.family_name || lastnameParts.join(" "),
              role: "client",
            })
            .select("role, deleted_at")
            .single();

          if (insertError) {
            const { data: racedProfile, error: rereadError } = await supabase
              .from("profiles")
              .select("role, deleted_at")
              .eq("id", session.user.id)
              .maybeSingle();
            if (rereadError || !racedProfile) throw insertError;
            profile = racedProfile;
          } else {
            profile = insertedProfile;
          }
        }

        if (profile.deleted_at) {
          throw new Error("This account is unavailable. Please contact an administrator.");
        }
        if (!["admin", "staff", "client"].includes(profile.role)) {
          throw new Error("This account has an invalid role. Please contact an administrator.");
        }

        navigate(["admin", "staff"].includes(profile.role) ? "/log-in?oauth=true" : "/", { replace: true });
      } catch (callbackError) {
        console.error("Google sign-in account validation failed:", callbackError);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error("Unable to clear the failed Google sign-in session:", signOutError);
        const message = String(callbackError?.message || callbackError).toLowerCase().includes("gmail.com")
          ? "Only @gmail.com accounts can sign in."
          : "Google sign-in could not be completed for this account. Please try the sign-in method already linked to it, or contact an administrator.";
        setError(message);
      }
    };

    void handleAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-rose-600">Authentication failed: {error}</p>
            <button 
              onClick={() => navigate("/log-in")}
              className="btn btn-black mt-4 rounded-full"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mx-auto mb-4" />
          <p className="text-slate-600">Completing sign in...</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default AuthCallback;