import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const COOLDOWN_SECONDS = 60;
  const RATE_LIMIT_SECONDS = 180;

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [cooldown, setCooldown] = useState(0);

  const cooldownKey = (value: string) => `otpCooldown:login:${value.trim().toLowerCase()}`;

  const getCooldown = (value: string) => {
    if (!value.trim()) return 0;
    const stored = localStorage.getItem(cooldownKey(value));
    if (!stored) return 0;
    const nextAllowed = Number(stored);
    if (!Number.isFinite(nextAllowed)) return 0;
    const remaining = Math.ceil((nextAllowed - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  const setCooldownWindow = (value: string, seconds = COOLDOWN_SECONDS) => {
    if (!value.trim()) return;
    const nextAllowed = Date.now() + seconds * 1000;
    localStorage.setItem(cooldownKey(value), `${nextAllowed}`);
    setCooldown(seconds);
  };

  useEffect(() => {
    if (!email.trim()) {
      setCooldown(0);
      return;
    }
    const update = () => setCooldown(getCooldown(email));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [email]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email.",
        variant: "destructive",
      });
      return;
    }

    const remaining = getCooldown(email);
    if (remaining > 0) {
      toast({
        title: "Please wait",
        description: `Try again in ${remaining} seconds.`,
      });
      return;
    }

    // Check if email exists in players table
    const { data: player, error: playerError } = await (supabase as any)
      .from("players")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (playerError) {
      toast({
        title: "Error",
        description: "Failed to validate email.",
        variant: "destructive",
      });
      return;
    }

    if (!player) {
      toast({
        title: "Email not found",
        description: "This email is not registered as a player.",
        variant: "destructive",
      });
      return;
    }

    // Send OTP code to email (no magic link)
    setSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    setSending(false);

    if (error) {
      const isRateLimited =
        (error as any)?.status === 429 ||
        error.message.toLowerCase().includes("rate");
      if (isRateLimited) {
        setCooldownWindow(email, RATE_LIMIT_SECONDS);
      }
      toast({
        title: "Login code error",
        description: error.message.includes("rate")
          ? "Email rate limit exceeded. Please wait a few minutes and try again."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    setCooldownWindow(email);
    setStep("verify");
    toast({
      title: "Code sent",
      description: "Check your email for the login code.",
    });
  };

  const handleVerify = async () => {
    if (!email.trim() || !code.trim()) {
      toast({
        title: "Code required",
        description: "Enter the code from your email.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setSending(false);

    if (error || !data.session) {
      toast({
        title: "Verification failed",
        description: error?.message || "Invalid or expired code.",
        variant: "destructive",
      });
      return;
    }

    const userId = data.session.user?.id;
    if (userId) {
      const { error: updateError } = await (supabase as any)
        .from("players")
        .update({ user_id: userId })
        .eq("email", email)
        .is("user_id", null);
      if (updateError) {
        console.warn("Failed to set players.user_id on login", updateError);
      }
    }

    toast({
      title: "Logged in",
      description: "Welcome back!",
    });
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <LogIn className="h-8 w-8 text-green-600" />
          <h1 className="text-4xl font-bold text-green-800">Player Login</h1>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {step === "request" && (
                <Button
                  onClick={handleSendCode}
                  disabled={!email || sending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {sending ? "Sending..." : "Send login code"}
                </Button>
              )}

              {step === "verify" && (
                <div className="space-y-3">
                  <div>
                    <Label>Enter the code</Label>
                    <Input
                      inputMode="numeric"
                      maxLength={8}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      placeholder="12345678"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleVerify}
                      disabled={!code || sending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white flex gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      {sending ? "Verifying..." : "Verify & Login"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={sending || cooldown > 0}
                      className="w-full"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link to="/registration" className="text-green-600 font-medium">
                  Register here
                </Link>
              </p>
              <p className="text-gray-600 mt-2">
                By using Sportsladder, you agree to the{" "}
                <Link to="/terms" className="text-green-600 font-medium">
                  Terms
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
