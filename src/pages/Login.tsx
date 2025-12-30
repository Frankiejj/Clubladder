import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email.",
        variant: "destructive",
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
      toast({
        title: "Login code error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

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

    toast({
      title: "Logged in",
      description: "Welcome back!",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 px-3 py-1 text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <LogIn className="h-8 w-8 text-green-600" />
            <h1 className="text-4xl font-bold text-green-800">Player Login</h1>
          </div>
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
                      disabled={sending}
                      className="w-full"
                    >
                      Resend code
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
