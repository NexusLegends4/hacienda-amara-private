import { supabase } from "../utils/supabase";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.search
      );

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/log-in?error=oauth_failed");
      } else {
        navigate("/");
      }
    };

    handleAuthCallback();
  }, [navigate]);

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