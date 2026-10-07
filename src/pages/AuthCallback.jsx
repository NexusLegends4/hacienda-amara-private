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
      // Get the auth code from URL
      const code = searchParams.get("code");
      const next = searchParams.get("next");

      if (!code) {
        console.error("No auth code in callback URL");
        navigate("/log-in?error=oauth_no_code");
        return;
      }

      try {
        // Use exchangeCodeForSession with the full search params
        // Supabase client automatically retrieves PKCE verifier from localStorage
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Auth callback exchange error:", exchangeError);
          
          // Fallback: try to get session directly (in case PKCE already handled)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.error("No session after fallback:", sessionError);
            navigate("/log-in?error=oauth_failed");
            return;
          }
          
          console.log("Session recovered via fallback:", !!session);
        }

        // Wait a bit for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("No session after exchange");
          navigate("/log-in?error=oauth_no_session");
          return;
        }

        console.log("OAuth successful, session established");
        // Redirect to home - auto login without OTP
        navigate("/");
      } catch (err) {
        console.error("Auth callback error:", err);
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