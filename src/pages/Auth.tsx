import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OtpType =
  | "magiclink"
  | "recovery"
  | "signup"
  | "email_change"
  | "email";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"checking" | "logged-in" | "error">(
    "checking"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse hash fragment for access_token/refresh_token (#access_token=...&refresh_token=...)
  const parseHashTokens = () => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
    return null;
  };

  useEffect(() => {
    async function verifySession() {
      try {
        const code = searchParams.get("code");
        const tokenHash =
          searchParams.get("token_hash") ?? searchParams.get("token");
        const type = searchParams.get("type") as OtpType | null;

        // New flow: short-lived code param
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            code
          );
          if (error || !data?.session) throw error;
          setStatus("logged-in");
          setTimeout(() => navigate("/app"), 600);
          return;
        }

        // Legacy/explicit token flow (?token=...&type=magiclink)
        if (tokenHash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });
          if (error || !data?.session) throw error;
          setStatus("logged-in");
          setTimeout(() => navigate("/app"), 600);
          return;
        }

        // Fallback: hash-based redirects (#access_token)
        const hashTokens = parseHashTokens();
        if (hashTokens) {
          const { data, error } = await supabase.auth.setSession(hashTokens);
          if (error || !data?.session) throw error;
          setStatus("logged-in");
          setTimeout(() => navigate("/app"), 600);
          return;
        }

        throw new Error("Magic link ongeldig of verlopen.");
      } catch (err: any) {
        console.error("[Auth Error]", err);
        setErrorMessage(err?.message || "Magic link ongeldig of verlopen.");
        setStatus("error");
      }
    }

    verifySession();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="text-center space-y-4">
        {status === "checking" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-green-700" />
            <p className="text-lg text-green-700 font-medium">
              Even geduld, we bevestigen je login.
            </p>
          </>
        )}

        {status === "logged-in" && (
          <p className="text-lg text-green-700 font-medium">
            Login succesvol! Je wordt doorgestuurd...
          </p>
        )}

        {status === "error" && (
          <>
            <p className="text-red-600 font-semibold">Er ging iets mis.</p>
            <p className="text-gray-600">
              {errorMessage || "Je magic link is ongeldig of verlopen."}
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
              >
                Terug naar login
              </button>
              <Link to="/login" className="text-sm text-green-700 underline">
                Of klik hier om opnieuw in te loggen
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
