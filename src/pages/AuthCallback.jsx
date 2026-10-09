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
        search: window.location.search,
        hash: window.location.hash
      });
      
      // Get the auth code from URL query params OR hash fragment
      // Supabase sometimes returns OAuth response in fragment (implicit flow)
      let code = searchParams.get("code");
      
      if (!code && window.location.hash) {
        // Try to get code from URL fragment (after #)
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        code = hashParams.get("code");
        console.log("AuthCallback: Got code from hash fragment:", !!code);
      }
      
      const next = searchParams.get("next");

      if (!code) {
        console.error("AuthCallback: No auth code in callback URL (query or hash)");
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
        console.log("AuthCallback: Fetching user profile for role-based redirect, user id:", session.user.id);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, firstname, lastname")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("AuthCallback: Profile fetch error:", profileError);
          
          // Profile doesn't exist - create it for new Google users
          if (profileError.code === 'PGRST116') { // No rows returned
            console.log("AuthCallback: Profile not found, creating new profile for Google user");
            
            const newProfile = {
              id: session.user.id,
              email: session.user.email,
              firstname: session.user.user_metadata?.full_name?.split(' ')[0] || session.user.email?.split('@')[0] || 'User',
              lastname: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              role: 'client', // Default role for new Google users
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { error: insertError } = await supabase
              .from("profiles")
              .insert(newProfile);
            
            if (insertError) {
              console.error("AuthCallback: Failed to create profile:", insertError);
              navigate("/");
              return;
            }
            
            console.log("AuthCallback: Created new profile for Google user, role: client");
            // Redirect to home for new client users
            navigate("/");
            return;
          }
          
          // Other profile errors - redirect to home
          console.error("AuthCallback: Profile error, redirecting to home");
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