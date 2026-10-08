import { supabase } from "../utils/supabase";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("AuthCallback: Starting OAuth callback", { 
        href: window.location.href,
        search: window.location.search 
      });
      
      // Get the auth code from URL
      const code = searchParams.get("code");
      const next = searchParams.get("next");

      if (!code) {
        console.error("AuthCallback: No auth code in callback URL");
        navigate("/log-in?error=oauth_no_code");
        return;
      }

      try {
        console.log("AuthCallback: Exchanging code for session");
        // Use exchangeCodeForSession with the full search params
        // Supabase client automatically retrieves PKCE verifier from localStorage
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("AuthCallback: Exchange error:", exchangeError);
          
          // Fallback: try to get session directly (in case PKCE already handled)
          console.log("AuthCallback: Trying fallback getSession");
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.error("AuthCallback: No session after fallback:", sessionError);
            navigate("/log-in?error=oauth_failed");
            return;
          }
          
          console.log("AuthCallback: Session recovered via fallback:", !!session);
        }

        // Wait a bit for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession();
        console.log("AuthCallback: Final session check:", !!session);
        if (!session) {
          console.error("AuthCallback: No session after exchange");
          navigate("/log-in?error=oauth_no_session");
          return;
        }

        // Fetch user profile to determine role and redirect accordingly
        console.log("AuthCallback: Fetching user profile for role-based redirect");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, firstname, lastname")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("AuthCallback: Profile fetch error:", profileError);
          // Default to home if profile fetch fails
          navigate("/");
          return;
        }

        console.log("AuthCallback: User role:", profile?.role);
        
        // Role-based redirect
        let redirectPath = "/";
        if (profile?.role === "admin") {
          redirectPath = "/admin-reservations"; // Admin dashboard
        } else if (profile?.role === "staff") {
          redirectPath = "/admin-reservations"; // Staff calendar
        } else if (profile?.role === "client") {
          redirectPath = "/"; // Customer home
        }

        console.log("AuthCallback: OAuth successful, redirecting to:", redirectPath);
        navigate(redirectPath);
      } catch (err) {
        console.error("AuthCallback: Unexpected error:", err);
        navigate("/log-in?error=oauth_exception");
      }
    };

    handleAuthCallback();
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