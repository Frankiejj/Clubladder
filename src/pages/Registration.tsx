import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";

export default function Registration() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const COOLDOWN_SECONDS = 60;
  const RATE_LIMIT_SECONDS = 180;
  const [sport, setSport] = useState<string>("");
  const { clubs, loading: clubsLoading } = useClubs(sport);

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("1");
  const [clubId, setClubId] = useState("");
  const [clubConfirmed, setClubConfirmed] = useState(false);
  const [availableSports, setAvailableSports] = useState<string[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const cooldownKey = (value: string) => `otpCooldown:register:${value.trim().toLowerCase()}`;

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

  useEffect(() => {
    const fetchSports = async () => {
      setSportsLoading(true);
      const { data, error } = await supabase
        .from("clubs")
        .select("sport")
        .order("sport");

      if (error) {
        console.error("Error fetching sports:", error);
        setSportsLoading(false);
        return;
      }

      const rows = (data as { sport: string | null }[] | null) ?? [];

      const uniqueSports = Array.from(
        new Set(
          rows
            .map((club) => club?.sport)
            .filter((sportName): sportName is string => Boolean(sportName))
        )
      );

      setAvailableSports(uniqueSports);
      setSportsLoading(false);
    };

    fetchSports();
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !lastName.trim() || !email.trim() || !sport || !clubId || !phone.trim() || !countryCode.trim()) {
      toast({
        title: "Missing information",
        description: "First name, last name, email, country code, phone, sport, and club are required.",
        variant: "destructive",
      });
      return;
    }
    if (!acceptedPolicies) {
      toast({
        title: "Confirmation required",
        description: "Please agree to the Terms.",
        variant: "destructive",
      });
      return;
    }
    if (clubId && !clubConfirmed) {
      toast({
        title: "Confirmation required",
        description: "Please confirm you are a member of the selected club.",
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

    setLoading(true);

    // Check if email already exists
    const { data: existing, error: existingError } = await (supabase as any)
      .from("players")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      toast({
        title: "Error",
        description: "Failed to validate email.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (existing) {
      toast({
        title: "Email already registered",
        description: "Use login instead.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Send passwordless email OTP (user confirms with the emailed code)
    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // No redirect to ensure the email contains the one-time code.
      },
    });

    if (signUpError) {
      const isRateLimited =
        (signUpError as any)?.status === 429 ||
        signUpError.message.toLowerCase().includes("rate");
      if (isRateLimited) {
        setCooldownWindow(email, RATE_LIMIT_SECONDS);
      }
      toast({
        title: "Registration failed",
        description: signUpError.message.includes("rate")
          ? "Email rate limit exceeded. Please wait a few minutes and try again."
          : signUpError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setCooldownWindow(email);
    setOtpSent(true);
    toast({
      title: "Check your email",
      description: "Enter the verification code we just sent to finish registration.",
    });

    setLoading(false);
  };

  const handleVerifyAndCreate = async () => {
    if (!otpCode.trim()) {
      toast({
        title: "Missing code",
        description: "Enter the verification code from your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Try the signup OTP type first (for email verification code). Fall back to email OTP for passwordless.
    const attemptVerify = async (type: "signup" | "email") => {
      return supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type,
      });
    };

    let { data: verifiedSession, error: verifyError } = await attemptVerify("signup");
    if (verifyError) {
      const fallback = await attemptVerify("email");
      verifiedSession = fallback.data;
      verifyError = fallback.error;
    }

    if (verifyError || !verifiedSession?.session) {
      toast({
        title: "Verification failed",
        description: verifyError?.message || "Invalid or expired code.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Ensure the session is active so the user is logged in immediately
    if (verifiedSession.session) {
      await supabase.auth.setSession({
        access_token: verifiedSession.session.access_token,
        refresh_token: verifiedSession.session.refresh_token,
      });
    }

    // Double-check no duplicate player
    const { data: existingPlayer, error: existingPlayerError } = await (supabase as any)
      .from("players")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingPlayerError) {
      toast({
        title: "Error",
        description: "Could not validate existing players.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (existingPlayer) {
      toast({
        title: "Already registered",
        description: "Account exists. Please log in.",
        variant: "destructive",
      });
      setLoading(false);
      navigate("/login");
      return;
    }

    const normalizedCountryCode = countryCode.replace(/[^\d]/g, "");
    const normalizedPhone = phone.replace(/[^\d]/g, "");
    const fullPhone = normalizedCountryCode
      ? `+${normalizedCountryCode}${normalizedPhone}`
      : phone.trim();

    const playerId = crypto.randomUUID();

    const userId = verifiedSession.session.user.id;
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("players")
      .insert({
        id: playerId,
        name,
        last_name: lastName,
        email,
        phone: fullPhone,
        is_admin: false,
        clubs: clubId ? [clubId] : [],
        avatar_url: null,
        user_id: userId,
      })
      .select("id")
      .single();

    if (insertError) {
      toast({
        title: "Database error",
        description: insertError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // If avatar provided, upload using the new player id
    if (avatarFile && inserted?.id) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const playerIdForAvatar = inserted?.id || playerId;
      const filePath = `${playerIdForAvatar}.${ext}`;
      const { error: uploadError } = await (supabase.storage.from("avatars") as any).upload(
        filePath,
        avatarFile,
        { upsert: true }
      );
      if (!uploadError) {
        const { data: publicUrlData } = (supabase.storage.from("avatars") as any).getPublicUrl(filePath);
        const avatarUrl = publicUrlData?.publicUrl ?? null;
        if (avatarUrl) {
          await (supabase as any)
            .from("players")
            .update({ avatar_url: avatarUrl })
            .eq("id", inserted.id);
        }
      }
    }

    toast({
      title: "Registration complete",
      description: "You're verified. You can join a ladder now.",
    });

    setLoading(false);
    navigate("/my-ladder");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6 text-green-700" />
              Create Account
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <Label>First name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label>Last name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>

            <div>
              <Label>Avatar (optional)</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 border border-green-200 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                    setAvatarPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">JPG/PNG; square works best.</p>
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpSent}
              />
            </div>

            <div>
              <Label>Phone *</Label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center rounded-md border border-input bg-background px-2 h-10">
                  <span className="text-sm text-muted-foreground">+</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-12 border-0 px-1 py-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                    aria-label="Country code"
                  />
                </div>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Sport *</Label>
              <Select
                value={sport || "none"}
                onValueChange={(value) => {
                  const selectedSport = value === "none" ? "" : value;
                  setSport(selectedSport);
                  setClubId("");
                  setClubConfirmed(false);
                }}
                disabled={sportsLoading || loading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose your sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select sport</SelectItem>
                  {sportsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading sports...
                    </SelectItem>
                  ) : availableSports.length ? (
                    availableSports.map((availableSport) => (
                      <SelectItem key={availableSport} value={availableSport}>
                        {availableSport.charAt(0).toUpperCase() + availableSport.slice(1)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="unavailable" disabled>
                      No sports available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Club *</Label>
              <Select
                value={clubId || "none"}
                onValueChange={(value) => {
                  const chosen = value === "none" ? "" : value;
                  setClubId(chosen);
                  setClubConfirmed(false);
                }}
                disabled={!sport || loading || clubsLoading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={sport ? "Select club" : "Select sport first"} />
                </SelectTrigger>
                <SelectContent>
                  {!sport ? (
                    <SelectItem value="none" disabled>
                      Select a sport first
                    </SelectItem>
                  ) : clubsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading clubs...
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">No club selected</SelectItem>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name}
                          {club.city ? ` (${club.city})` : ""}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {clubId && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="club-confirm"
                  checked={clubConfirmed}
                  onCheckedChange={(checked) => setClubConfirmed(Boolean(checked))}
                />
                <Label htmlFor="club-confirm" className="text-sm text-gray-700 leading-snug">
                  I confirm that I am a member of the selected club.
                </Label>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Checkbox
                id="policies-confirm"
                checked={acceptedPolicies}
                onCheckedChange={(checked) => setAcceptedPolicies(Boolean(checked))}
              />
              <Label htmlFor="policies-confirm" className="text-sm text-gray-700 leading-snug">
                I agree to the{" "}
                <Link to="/terms" className="text-green-600 font-medium">
                  Terms
                </Link>
                .
              </Label>
            </div>


            {otpSent && (
              <div>
                <Label>Verification code</Label>
                <Input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="mt-1"
                  placeholder="Enter code from email"
                  maxLength={12}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the code sent to your email to finish registering.
                </p>
              </div>
            )}

            {!otpSent ? (
              <Button
                onClick={handleRegister}
                disabled={loading || cooldown > 0}
                className="w-full bg-green-700 hover:bg-green-800 text-white"
              >
                {loading
                  ? "Sending code..."
                  : cooldown > 0
                  ? `Send again in ${cooldown}s`
                  : "Send verification code"}
              </Button>
            ) : (
              <Button
                onClick={handleVerifyAndCreate}
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white"
              >
                {loading ? "Verifying..." : "Verify code & register"}
              </Button>
            )}

            <p className="text-center text-sm text-gray-600">
              By registering, you agree to the{" "}
              <Link to="/terms" className="text-green-600 font-medium">
                Terms
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


