import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { clubs } = useClubs(sport);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clubId, setClubId] = useState("");
  const [ladders, setLadders] = useState<Array<{ id: string; name: string; type: "singles" | "doubles" }>>([]);
  const [laddersLoading, setLaddersLoading] = useState(false);
  const [selectedLadderId, setSelectedLadderId] = useState("");
  const [clubPlayers, setClubPlayers] = useState<Array<{ id: string; name: string; clubs: string[] | null }>>([]);
  const [partnerId, setPartnerId] = useState("");
  const [matchFrequency, setMatchFrequency] = useState(1);
  const [availableSports, setAvailableSports] = useState<string[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const formatLadderName = (name?: string | null, fallback?: string) => {
    if (!name) return fallback || "Ladder";
    return name.replace(/\s*\((Singles|Doubles)\)\s*/gi, " ").trim();
  };

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

  useEffect(() => {
    const loadLadders = async () => {
      if (!clubId) {
        setLadders([]);
        setSelectedLadderId("");
        setPartnerId("");
        return;
      }
      setLaddersLoading(true);
      const { data, error } = await (supabase as any)
        .from("ladders")
        .select("id,name,type")
        .eq("club_id", clubId);
      if (error) {
        console.error("Error loading ladders", error);
        toast({
          title: "Could not load ladders",
          description: error.message,
          variant: "destructive",
        });
        setLadders([]);
      } else {
        setLadders((data as any[]) || []);
      }
      setLaddersLoading(false);
    };

    const loadClubPlayers = async () => {
      if (!clubId) {
        setClubPlayers([]);
        setPartnerId("");
        return;
      }
      const { data, error } = await (supabase as any)
        .from("players")
        .select("id,name,clubs")
        .contains("clubs", [clubId]);
      if (error) {
        console.error("Error loading club players", error);
        setClubPlayers([]);
        return;
      }
      setClubPlayers((data as any[]) || []);
    };

    loadLadders();
    loadClubPlayers();
  }, [clubId, toast]);

  const selectedLadder = ladders.find((l) => l.id === selectedLadderId);
  const isDoublesLadder = selectedLadder?.type === "doubles";

  // Clear partner if switching away from doubles
  useEffect(() => {
    if (!isDoublesLadder && partnerId) {
      setPartnerId("");
    }
  }, [isDoublesLadder, partnerId]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !sport || !clubId || !phone.trim()) {
      toast({
        title: "Missing information",
        description: "Name, email, phone, sport, and club are required.",
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

    // Determine next available rank for this club (append to bottom)
    let nextRank = 1;
    const { data: highestRank, error: rankError } = await (supabase as any)
      .from("players")
      .select("rank")
      .contains("clubs", [clubId])
      .order("rank", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rankError) {
      console.error("Failed to fetch highest rank for club:", rankError);
    } else if (highestRank?.rank && Number.isFinite(highestRank.rank)) {
      nextRank = highestRank.rank + 1;
    }

    const playerId = crypto.randomUUID();

    const userId = verifiedSession.session.user.id;
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("players")
      .insert({
        id: playerId,
        name,
        email,
        phone,
        gender: null,
        rank: nextRank, // new players go to bottom
        wins: 0,
        losses: 0,
        singles_match_frequency: matchFrequency,
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

    // Add ladder membership if a ladder was chosen
    if (selectedLadderId) {
      let nextRank = 1;
      const { data: rankRows, error: rankError } = await (supabase as any)
        .from("ladder_memberships")
        .select("rank")
        .eq("ladder_id", selectedLadderId)
        .order("rank", { ascending: false })
        .limit(1);
      if (!rankError) {
        const top = (rankRows as any[] | null)?.[0]?.rank;
        if (Number.isFinite(top)) {
          nextRank = Number(top) + 1;
        }
      }

      const membershipPayload: any = {
        ladder_id: selectedLadderId,
        player_id: inserted?.id || playerId,
        match_frequency: matchFrequency,
        partner_id: isDoublesLadder ? partnerId || null : null,
        rank: nextRank,
      };

      const { error: membershipError } = await (supabase as any)
        .from("ladder_memberships")
        .insert(membershipPayload);

      if (membershipError) {
        if (membershipError.code === "23505") {
          const { error: updateError } = await (supabase as any)
            .from("ladder_memberships")
            .update({
              match_frequency: matchFrequency,
              partner_id: isDoublesLadder ? partnerId || null : null,
            })
            .eq("ladder_id", selectedLadderId)
            .eq("player_id", inserted?.id || playerId);
          if (updateError) {
            toast({
              title: "Registration warning",
              description: "Profile created, but could not update ladder membership.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Registration complete",
              description: "You're verified and added to the ladder.",
            });
          }
        } else {
          toast({
            title: "Registration warning",
            description: "Profile created, but could not add ladder membership.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Registration complete",
          description: "You're verified and added to the ladder.",
        });
      }
    } else {
      toast({
        title: "Registration complete",
        description: "You're verified. You can join a ladder later.",
      });
    }

    setLoading(false);
    navigate("/");
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
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div>
              <Label>Sport *</Label>
              <Select
                value={sport || "none"}
                onValueChange={(value) => {
                  const selectedSport = value === "none" ? "" : value;
                  setSport(selectedSport);
                  setClubId("");
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
                  setSelectedLadderId("");
                  setPartnerId("");
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No club selected</SelectItem>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                      {club.city ? ` (${club.city})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {clubId && (
              <div>
                <Label>Ladder</Label>
                <Select
                  value={selectedLadderId || "none"}
                  onValueChange={(value) => setSelectedLadderId(value === "none" ? "" : value)}
                  disabled={laddersLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select ladder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled={laddersLoading}>
                      {laddersLoading ? "Loading ladders..." : "Choose a ladder"}
                    </SelectItem>
                    {[...ladders]
                      .sort((a, b) => {
                        if (a.type === b.type) return (a.name || "").localeCompare(b.name || "");
                        return a.type === "singles" ? -1 : 1;
                      })
                      .map((ladder) => (
                      <SelectItem key={ladder.id} value={ladder.id}>
                        {formatLadderName(ladder.name, ladder.type)}
                      </SelectItem>
                    ))}
                    {!laddersLoading && ladders.length === 0 && (
                      <SelectItem value="no-ladders" disabled>
                        No ladders available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isDoublesLadder && (
              <div>
                <Label>Choose your partner (same club)</Label>
                <Select
                  value={partnerId || "none"}
                  onValueChange={(value) => setPartnerId(value === "none" ? "" : value)}
                  disabled={clubPlayers.length === 0}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select partner</SelectItem>
                    {clubPlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                    {clubPlayers.length === 0 && (
                      <SelectItem value="no-partners" disabled>
                        No club players available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Partner must already be a member of this club.
                </p>
              </div>
            )}

            {selectedLadderId && (
              <div>
                <Label>Match frequency per round</Label>
                <Select
                  value={matchFrequency.toString()}
                  onValueChange={(value) => setMatchFrequency(parseInt(value, 10))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
